import unittest
from backend.app.models.schemas import HarmonizedDetection
from backend.app.harmonization.clustering import cluster_detections
from backend.app.harmonization.baseline import compute_daily_calendar_and_anomalies

class HarmonizationTestCase(unittest.TestCase):
    def test_clustering_coincident_overlap_does_not_double_count(self):
        """
        Critical scientific test:
        1 MODIS detection and 4 VIIRS detections covering the same fire front.
        Naive sum would equal 5.
        Harmonized Fire Pixel Equivalent (HFPE) must be less than 5, reconciling resolution.
        """
        modis_det = HarmonizedDetection(
            id="M1",
            latitude=40.001,
            longitude=-121.001,
            sensor="MODIS",
            satellite="Aqua",
            acq_datetime="2024-08-20T13:30:00Z",
            acq_date="2024-08-20",
            acq_time="1330",
            daynight="D",
            brightness_k=330.0,
            frp_mw=30.0,
            confidence_category="high",
            confidence_normalized=0.9,
            confidence_original="90",
            scan=1.0,
            track=1.0,
            pixel_area_km2=1.0
        )

        viirs_dets = [
            HarmonizedDetection(
                id=f"V{i}",
                latitude=40.001 + (i * 0.002),
                longitude=-121.001 + (i * 0.002),
                sensor="VIIRS",
                satellite="Suomi-NPP",
                acq_datetime="2024-08-20T13:32:00Z",
                acq_date="2024-08-20",
                acq_time="1332",
                daynight="D",
                brightness_k=335.0,
                frp_mw=8.0,
                confidence_category="high",
                confidence_normalized=0.95,
                confidence_original="high",
                scan=0.375,
                track=0.375,
                pixel_area_km2=0.14
            )
            for i in range(4)
        ]

        all_dets = [modis_det] + viirs_dets
        clusters, updated = cluster_detections(all_dets)

        # Should merge into 1 unified fire cluster event
        self.assertEqual(len(clusters), 1)
        cluster = clusters[0]
        self.assertEqual(cluster.overlap_status, "COINCIDENT_OVERLAP")
        self.assertEqual(cluster.modis_count, 1)
        self.assertEqual(cluster.viirs_count, 4)
        self.assertEqual(cluster.total_raw_detections, 5)

        # HFPE MUST be strictly less than naive sum of 5
        self.assertLess(cluster.harmonized_fire_pixel_equivalent, 5.0)
        self.assertGreaterEqual(cluster.harmonized_fire_pixel_equivalent, 1.0)

    def test_daily_calendar_and_anomaly_detection(self):
        raw_cluster_list = []
        # Create baseline clusters for 10 days
        for day in range(1, 15):
            d_str = f"2024-08-{day:02d}"
            # normal low activity
            frp = 20.0 if day < 12 else 250.0  # huge spike on day 12+
            clusters, _ = cluster_detections([
                HarmonizedDetection(
                    id=f"D_{day}",
                    latitude=40.0,
                    longitude=-121.0,
                    sensor="MODIS",
                    satellite="Terra",
                    acq_datetime=f"{d_str}T10:30:00Z",
                    acq_date=d_str,
                    acq_time="1030",
                    daynight="D",
                    brightness_k=320.0,
                    frp_mw=frp,
                    confidence_category="nominal",
                    confidence_normalized=0.6,
                    confidence_original="60",
                    scan=1.0,
                    track=1.0,
                    pixel_area_km2=1.0
                )
            ])
            raw_cluster_list.extend(clusters)

        daily = compute_daily_calendar_and_anomalies(raw_cluster_list)
        self.assertEqual(len(daily), 14)

        # The spike on day 12 or 13 should have a high Z-score
        spike_day = daily[11]
        self.assertGreater(spike_day.z_score, 2.0)
        self.assertTrue(spike_day.is_unusual_activity)
        self.assertIn("Analytical indicator", spike_day.analytical_flag)

if __name__ == "__main__":
    unittest.main()

