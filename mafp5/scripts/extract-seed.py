"""Extract structured seed data from data-output-regional2.xlsx.

Each worksheet = one Pelabuhan. Produces prisma/seed-data.json:
{
  "regionalName": "REGIONAL 2",
  "periode": {"bulan": "MEI", "tahun": 2026},
  "pelabuhan": [
     {"nama": "...", "operatorDefault": "...", "kategori": [
         {"nama": "DERMAGA", "urutan": 1, "fasilitas": [
             {"nama": "...", "konstruksi": "...", "operator": "...", "objek": [
                 {"nama": "Pelat Lantai", "panjang":.., "lebar":.., "luas":.., "jumlah":..,
                  "tersedia":.., "rusakRingan":.., "rusakSedang":.., "rusakBerat":.., "siapPakai":..,
                  "satuan": "m2"|"unit"|"m", "keterangan": ".."}
             ]}
         ]}
     ]}
  ]
}
"""
import json
import re
import openpyxl

ROMAN = {"I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X",
         "XI", "XII", "XIII", "XIV", "XV"}

SRC = "data-output-regional2.xlsx"
OUT = "prisma/seed-data.json"


def num(v):
    if v is None:
        return None
    if isinstance(v, (int, float)):
        return float(v)
    return None


def clean(v):
    if v is None:
        return None
    s = str(v).strip()
    return s or None


def infer_satuan(panjang, lebar, luas, jumlah):
    if luas:
        return "m2"
    if jumlah:
        return "unit"
    if panjang:
        return "m"
    return "unit"


MONTHLY = re.compile(r"^[A-Z]{3}-\d{4}$")


def main():
    wb = openpyxl.load_workbook(SRC, data_only=True)
    periode = None
    regionals = {}  # name -> {nama, pelabuhan: []}

    for ws in wb.worksheets:
        # skip monthly history sheets (different schema, single port)
        if MONTHLY.match(ws.title.strip()):
            continue
        rows = list(ws.iter_rows(values_only=True))
        # metadata scan (first ~10 rows)
        regional = None
        nama_pel = ws.title
        # Regional 3 branch sheets: "Lap. Reg3 Cab. X"
        m3 = re.match(r"Lap\.\s*Reg3\s*Cab\.\s*(.+)", ws.title, re.I)
        if m3:
            regional = "REGIONAL 3"
            nama_pel = m3.group(1).strip().title()
        operator_default = None
        for r in rows[:10]:
            cells = [clean(c) for c in r]
            joined = " ".join([c for c in cells if c])
            m = re.search(r"(REGIONAL\s*\d+)", joined, re.I)
            if m and not regional:
                regional = m.group(1).upper()
            # value cells like ': TANJUNG PRIOK'
            for i, c in enumerate(cells):
                if c and c.upper().startswith("PELABUHAN"):
                    # next non-empty cell that starts with ':'
                    for c2 in cells[i + 1:]:
                        if c2 and c2.startswith(":"):
                            nama_pel = c2.lstrip(":").strip().title()
                            break
                if c and c.upper().startswith("PERIODIK"):
                    for c2 in cells[i + 1:]:
                        if c2 and c2.startswith(":"):
                            if not periode:
                                periode = {"bulan": c2.lstrip(":").strip().upper()}
                            break
                if c and c.upper().startswith("TAHUN"):
                    for c2 in cells[i + 1:]:
                        if c2 and c2.startswith(":"):
                            th = c2.lstrip(":").strip()
                            if periode and th.isdigit():
                                periode["tahun"] = int(th)
                            break

        kategori_list = []
        cur_kat = None
        cur_fas = None
        kat_urut = 0

        # find header data start: row with idx1..idx18 numbering
        start = 0
        for i, r in enumerate(rows):
            if len(r) > 11 and r[1] == 1 and r[2] == 2 and r[3] == 3:
                start = i + 1
                break

        for r in rows[start:]:
            if len(r) < 19:
                r = tuple(list(r) + [None] * (19 - len(r)))
            no = clean(r[1])
            fasilitas = clean(r[2])
            nama_fas = clean(r[3])
            objek = clean(r[4])
            panjang = num(r[5])
            lebar = num(r[6])
            luas = num(r[7])
            jumlah = num(r[8])
            konstruksi = clean(r[9])
            tersedia = num(r[10])
            rr = num(r[11])
            rs = num(r[12])
            rb = num(r[13])
            siap = num(r[14])
            operator = clean(r[17])
            ket = clean(r[18])

            # skip example / label rows
            if fasilitas and fasilitas.lower().startswith("contoh"):
                continue

            # category header row: roman numeral in No. and category name present, no objek/nama
            if no in ROMAN and fasilitas and not objek and not nama_fas:
                kat_urut += 1
                cur_kat = {"nama": fasilitas.upper(), "urutan": kat_urut, "fasilitas": []}
                kategori_list.append(cur_kat)
                cur_fas = None
                continue

            # facility row
            if nama_fas:
                if cur_kat is None:
                    kat_urut += 1
                    cur_kat = {"nama": (fasilitas or "LAINNYA").upper(),
                               "urutan": kat_urut, "fasilitas": []}
                    kategori_list.append(cur_kat)
                cur_fas = {
                    "nama": nama_fas,
                    "konstruksi": konstruksi,
                    "operator": operator,
                    "objek": [],
                }
                cur_kat["fasilitas"].append(cur_fas)
                if operator and not operator_default:
                    operator_default = operator
                # facility row may also carry first objek inline
                if objek:
                    cur_fas["objek"].append({
                        "nama": objek,
                        "panjang": panjang, "lebar": lebar, "luas": luas, "jumlah": jumlah,
                        "tersedia": tersedia, "rusakRingan": rr, "rusakSedang": rs,
                        "rusakBerat": rb, "siapPakai": siap,
                        "satuan": infer_satuan(panjang, lebar, luas, jumlah),
                        "keterangan": ket,
                    })
                continue

            # objek row
            if objek and cur_fas is not None:
                cur_fas["objek"].append({
                    "nama": objek,
                    "panjang": panjang, "lebar": lebar, "luas": luas, "jumlah": jumlah,
                    "tersedia": tersedia, "rusakRingan": rr, "rusakSedang": rs,
                    "rusakBerat": rb, "siapPakai": siap,
                    "satuan": infer_satuan(panjang, lebar, luas, jumlah),
                    "keterangan": ket,
                })
                continue

        # keep only categories that have facilities with objek
        kategori_list = [k for k in kategori_list
                         if any(f["objek"] for f in k["fasilitas"])]
        for k in kategori_list:
            k["fasilitas"] = [f for f in k["fasilitas"] if f["objek"]]

        if kategori_list:
            regional = regional or "REGIONAL 2"
            reg = regionals.setdefault(regional, {"nama": regional, "pelabuhan": []})
            # dedupe by pelabuhan name within a regional (keep richest)
            existing = next((p for p in reg["pelabuhan"] if p["nama"] == nama_pel), None)
            new_obj = sum(len(o["objek"]) for k in kategori_list for o in k["fasilitas"])
            entry = {
                "nama": nama_pel,
                "operatorDefault": operator_default,
                "kategori": kategori_list,
            }
            if existing is None:
                reg["pelabuhan"].append(entry)
            else:
                ex_obj = sum(len(o["objek"]) for k in existing["kategori"] for o in k["fasilitas"])
                if new_obj > ex_obj:
                    reg["pelabuhan"].remove(existing)
                    reg["pelabuhan"].append(entry)

    result = {
        "periode": periode or {"bulan": "MEI", "tahun": 2026},
        "regionals": sorted(regionals.values(), key=lambda r: r["nama"]),
    }
    with open(OUT, "w") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    # summary
    print("Periode:", result["periode"])
    for reg in result["regionals"]:
        print("Regional:", reg["nama"], "-", len(reg["pelabuhan"]), "pelabuhan")
        for p in reg["pelabuhan"]:
            nf = sum(len(f["fasilitas"]) for f in p["kategori"])
            no = sum(len(o["objek"]) for k in p["kategori"] for o in k["fasilitas"])
            print(f"    - {p['nama']}: {len(p['kategori'])} kategori, {nf} fasilitas, {no} objek")
    tot_obj = sum(len(o["objek"]) for reg in result["regionals"]
                  for p in reg["pelabuhan"] for k in p["kategori"] for o in k["fasilitas"])
    print("TOTAL objek:", tot_obj)


if __name__ == "__main__":
    main()
