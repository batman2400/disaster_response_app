INSERT INTO wards (id, name, rainfall_mm, river_level_pct, status) VALUES
('ward_01', 'Nagalagam Street (Kelani River Basin)', 68.0, 88.0, 'CRITICAL'),
('ward_02', 'Thimbirigasyaya / Town Hall', 42.0, 62.0, 'WATCH'),
('ward_03', 'Pettah / Colombo Fort', 8.0, 15.0, 'NORMAL');

INSERT INTO shelters (ward_id, name, total_beds, occupied_beds, supplies_status) VALUES
('ward_01', 'Kelaniya Temple Hall', 120, 96, 'LOW'),
('ward_01', 'Peliyagoda Community Centre', 80, 22, 'ADEQUATE'),
('ward_02', 'Town Hall Relief Bay', 150, 61, 'ADEQUATE'),
('ward_02', 'Thimbirigasyaya School', 90, 88, 'CRITICAL'),
('ward_03', 'Fort Railway Waiting Hall', 60, 12, 'ADEQUATE');

-- Clustered floods ~150m apart in ward_01 so check_cluster() returns >= 2.
INSERT INTO hazards (lat, lng, ward_id, category, description, status, urgency, confidence_score, is_road_blocked, confirmations_count)
VALUES
(6.9535, 79.8732, 'ward_01', 'FLOOD', 'Waist-deep water near Nagalagam bridge', 'AREA_ALERT', 'CRITICAL', 0.91, TRUE, 4),
(6.9548, 79.8734, 'ward_01', 'FLOOD', 'Road impassable, cars stalled', 'PUBLISHED', 'CRITICAL', 0.84, TRUE, 2),
(6.9271, 79.8612, 'ward_02', 'FALLEN_TREE', 'Large tree across Bauddhaloka Mawatha', 'COUNCIL_TICKET', 'MEDIUM', 0.72, TRUE, 1),
(6.9355, 79.8500, 'ward_03', 'HELP_REQUEST', 'Family of 5 needs dry shelter tonight', 'NEED_INFO', 'MEDIUM', 0.41, FALSE, 0);
