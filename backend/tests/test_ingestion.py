import unittest
from backend.app.ingestion.parser import parse_firms_csv, normalize_confidence, format_acq_time

class IngestionTestCase(unittest.TestCase):
    def test_format_acq_time(self):
        self.assertEqual(format_acq_time("45"), "0045")
        self.assertEqual(format_acq_time(930), "0930")
        self.assertEqual(format_acq_time("1335"), "1335")
        self.assertEqual(format_acq_time(1335.0), "1335")

    def test_normalize_confidence_modis(self):
        cat_l, norm_l, _ = normalize_confidence(20, "MODIS")
        self.assertEqual(cat_l, "low")
        self.assertEqual(norm_l, 0.20)

        cat_n, norm_n, _ = normalize_confidence(65, "MODIS")
        self.assertEqual(cat_n, "nominal")
        self.assertEqual(norm_n, 0.65)

        cat_h, norm_h, _ = normalize_confidence(90, "MODIS")
        self.assertEqual(cat_h, "high")
        self.assertEqual(norm_h, 0.90)

    def test_normalize_confidence_viirs(self):
        cat_l, norm_l, _ = normalize_confidence("l", "VIIRS")
        self.assertEqual(cat_l, "low")
        cat_n, norm_n, _ = normalize_confidence("n", "VIIRS")
        self.assertEqual(cat_n, "nominal")
        cat_h, norm_h, _ = normalize_confidence("h", "VIIRS")
        self.assertEqual(cat_h, "high")

    def test_parse_firms_csv_modis(self):
        csv_text = """latitude,longitude,brightness,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_t31,frp,daynight
40.123,-121.456,325.4,1.1,1.0,2024-08-15,1030,T,MODIS,85,6.1N,295.2,45.2,D
"""
        records, warnings = parse_firms_csv(csv_text)
        self.assertEqual(len(records), 1)
        rec = records[0]
        self.assertEqual(rec.sensor, "MODIS")
        self.assertEqual(rec.satellite, "Terra")
        self.assertEqual(rec.confidence_category, "high")
        self.assertEqual(rec.frp_mw, 45.2)

    def test_parse_firms_csv_viirs(self):
        csv_text = """latitude,longitude,bright_ti4,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_ti5,frp,daynight
40.124,-121.458,338.2,0.4,0.4,2024-08-15,1330,N,VIIRS,n,2.0NRT,298.1,12.5,D
"""
        records, warnings = parse_firms_csv(csv_text)
        self.assertEqual(len(records), 1)
        rec = records[0]
        self.assertEqual(rec.sensor, "VIIRS")
        self.assertEqual(rec.satellite, "Suomi-NPP")
        self.assertEqual(rec.confidence_category, "nominal")
        self.assertEqual(rec.pixel_area_km2, 0.16)

if __name__ == "__main__":
    unittest.main()

