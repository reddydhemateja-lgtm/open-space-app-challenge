import unittest
from backend.app.api.health import get_health
from backend.app.main import root
from backend.app.api.methodology import get_methodology
from backend.app.api.data import get_metadata, get_detections, get_clusters
from backend.app.api.calendar import get_daily_calendar, get_monthly_summary
from backend.app.api.comparison import get_sensor_comparison

class ApiEndpointsTestCase(unittest.TestCase):
    def test_health_endpoint(self):
        res = get_health()
        self.assertEqual(res["status"], "healthy")
        self.assertIn("MODIS", res["supported_sensors"])
        self.assertIn("VIIRS", res["supported_sensors"])

    def test_root_endpoint(self):
        res = root()
        self.assertIn("docs", res)
        self.assertIn("health", res)

    def test_methodology_endpoint(self):
        res = get_methodology()
        self.assertIn("scientific_rationale", res)
        self.assertIn("harmonization_algorithm", res["scientific_rationale"])

    def test_data_metadata_endpoint(self):
        meta = get_metadata()
        self.assertTrue(meta.is_demonstration_data)
        self.assertGreater(meta.total_raw_detections, 0)
        self.assertGreater(meta.total_harmonized_clusters, 0)

    def test_data_detections_endpoint(self):
        res = get_detections(sensor="MODIS", limit=10)
        self.assertGreaterEqual(len(res["detections"]), 1)
        self.assertEqual(res["detections"][0]["sensor"], "MODIS")

    def test_data_clusters_endpoint(self):
        res = get_clusters(overlap_status="COINCIDENT_OVERLAP")
        self.assertGreaterEqual(res["total_clusters"], 1)

    def test_calendar_daily_endpoint(self):
        res = get_daily_calendar()
        self.assertGreaterEqual(len(res), 30)
        self.assertTrue(hasattr(res[0], "harmonized_fire_pixel_equivalent"))

    def test_calendar_monthly_endpoint(self):
        res = get_monthly_summary()
        self.assertGreaterEqual(len(res), 2)

    def test_sensor_comparison_endpoint(self):
        comp = get_sensor_comparison()
        self.assertGreater(comp.modis_total_detections, 0)
        self.assertGreater(comp.viirs_total_detections, 0)
        self.assertGreater(comp.detection_ratio_viirs_to_modis, 1.0)

if __name__ == "__main__":
    unittest.main()
