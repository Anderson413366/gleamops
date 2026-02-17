BEGIN;

-- ---------------------------------------------------------------------------
-- Task catalog master library seed + decimal minute support
-- ---------------------------------------------------------------------------

ALTER TABLE public.tasks
  ALTER COLUMN default_minutes TYPE NUMERIC(8,2)
  USING CASE
    WHEN default_minutes IS NULL THEN NULL
    ELSE default_minutes::NUMERIC
  END;

WITH target_tenant AS (
  SELECT id FROM public.tenants ORDER BY created_at LIMIT 1
),
seed(task_code, name, category, subcategory, priority_level, default_minutes, unit_code, production_rate_sqft_per_hour, production_rate, description) AS (
  VALUES
  -- General Floors
  ('GF01R','Vacuum Carpeted Areas','GENERAL_FLOORS','ROUTINE','MEDIUM',5.00,'SQFT_1000',1200,'1,200 Per Thousand Sq. Ft.','Vacuum all carpeted traffic and perimeter areas.'),
  ('GF02R','Mop Hard Surface Floors','GENERAL_FLOORS','ROUTINE','MEDIUM',8.00,'SQFT_1000',800,'800 Per Thousand Sq. Ft.','Damp mop all hard-surface floors.'),
  ('GF03P','Spot Clean Carpet Stains','GENERAL_FLOORS','PROJECT','HIGH',3.00,'EACH',0.10,'0.1 Each','Treat visible carpet stains using approved chemicals.'),
  ('GF04R','Dust Mop VCT Floors','GENERAL_FLOORS','ROUTINE','LOW',4.50,'SQFT_1000',1500,'1,500 Per Thousand Sq. Ft.','Dust mop and collect debris from VCT floors.'),
  ('GF05P','Machine Scrub Floors','GENERAL_FLOORS','PERIODIC','HIGH',18.00,'SQFT_1000',450,'450 Per Thousand Sq. Ft.','Auto-scrub and recover solution on hard floors.'),
  ('GF06P','High-Speed Burnish Floors','GENERAL_FLOORS','PERIODIC','MEDIUM',14.00,'SQFT_1000',550,'550 Per Thousand Sq. Ft.','Burnish floor finish to restore gloss.'),

  -- Restrooms
  ('RR01R','Clean and Sanitize Toilets','RESTROOMS','ROUTINE','HIGH',4.00,'EACH',2.00,'2 Each','Disinfect toilet bowls, seats, and bases.'),
  ('RR02R','Clean and Sanitize Sinks','RESTROOMS','ROUTINE','HIGH',2.00,'EACH',3.00,'3 Each','Clean sink basins, fixtures, and counters.'),
  ('RR03R','Refill Paper Products','RESTROOMS','ROUTINE','MEDIUM',1.00,'EACH',5.00,'5 Each','Restock tissue, towels, and soap.'),
  ('RR04R','Mop Restroom Floor','RESTROOMS','ROUTINE','MEDIUM',3.00,'SQFT_1000',500,'500 Per Thousand Sq. Ft.','Damp mop and disinfect restroom flooring.'),
  ('RR05P','Descale Restroom Fixtures','RESTROOMS','PERIODIC','HIGH',6.50,'EACH',1.50,'1.5 Each','Remove mineral buildup from fixtures.'),
  ('RR06P','Deep Clean Grout Lines','RESTROOMS','PERIODIC','HIGH',12.00,'SQFT_1000',300,'300 Per Thousand Sq. Ft.','Scrub and detail grout in tiled surfaces.'),

  -- Furniture & Detail Cleaning
  ('FD01R','Dust Horizontal Surfaces','FURNITURE_DETAIL','ROUTINE','LOW',10.00,'SQFT_1000',2000,'2,000 Per Thousand Sq. Ft.','Dust desks, shelves, and reachable horizontal surfaces.'),
  ('FD02R','Wipe Down Desks','FURNITURE_DETAIL','ROUTINE','MEDIUM',0.50,'EACH',1.00,'1 Each','Wipe desk tops and edge surfaces.'),
  ('FD03R','Clean Glass Entry Doors','FURNITURE_DETAIL','ROUTINE','MEDIUM',2.00,'EACH',1.00,'1 Each','Spot clean and polish glass entry doors.'),
  ('FD04R','Empty Trash Receptacles','FURNITURE_DETAIL','ROUTINE','HIGH',0.30,'EACH',1.00,'1 Each','Empty waste receptacles and replace liners.'),
  ('FD05P','Detail Dust Vents and Ledges','FURNITURE_DETAIL','PERIODIC','MEDIUM',7.00,'SQFT_1000',700,'700 Per Thousand Sq. Ft.','Detail dust vent covers, ledges, and trim.'),
  ('FD06P','Polish Stainless Surfaces','FURNITURE_DETAIL','PERIODIC','LOW',2.50,'EACH',1.00,'1 Each','Polish stainless steel appliances and trim.'),

  -- Carpeting
  ('CP01R','Vacuum Carpet Edges','CARPETING','ROUTINE','LOW',3.00,'SQFT_1000',1400,'1,400 Per Thousand Sq. Ft.','Edge vacuum perimeter and corners.'),
  ('CP02P','Extract Carpet Lanes','CARPETING','PERIODIC','HIGH',20.00,'SQFT_1000',280,'280 Per Thousand Sq. Ft.','Hot-water extract major traffic lanes.'),
  ('CP03P','Encapsulation Cleaning','CARPETING','PERIODIC','MEDIUM',16.00,'SQFT_1000',350,'350 Per Thousand Sq. Ft.','Encap clean broadloom carpet areas.'),
  ('CP04P','Carpet Bonnet Buff','CARPETING','PROJECT','MEDIUM',15.00,'SQFT_1000',380,'380 Per Thousand Sq. Ft.','Bonnet buff carpeted open areas.'),
  ('CP05R','Set Pile and Groom Carpet','CARPETING','ROUTINE','LOW',2.75,'SQFT_1000',1800,'1,800 Per Thousand Sq. Ft.','Groom carpet pile after cleaning.'),
  ('CP06P','Apply Spot Protectant','CARPETING','PROJECT','LOW',3.50,'EACH',0.8,'0.8 Each','Apply stain-protection treatment to spots.'),

  -- Kitchen & Break Rooms
  ('KB01R','Sanitize Breakroom Counters','KITCHEN_BREAKROOMS','ROUTINE','HIGH',2.50,'EACH',2.00,'2 Each','Wipe and sanitize food-contact counters.'),
  ('KB02R','Clean Exterior of Appliances','KITCHEN_BREAKROOMS','ROUTINE','MEDIUM',1.50,'EACH',2.00,'2 Each','Wipe exterior of microwaves, fridges, and small appliances.'),
  ('KB03R','Spot Mop Breakroom Floor','KITCHEN_BREAKROOMS','ROUTINE','MEDIUM',2.00,'SQFT_1000',700,'700 Per Thousand Sq. Ft.','Spot mop spills and soiled traffic areas.'),
  ('KB04P','Deep Clean Microwave Interior','KITCHEN_BREAKROOMS','PERIODIC','HIGH',4.50,'EACH',1.00,'1 Each','Degrease and sanitize microwave interior.'),
  ('KB05P','Detail Sink Drains and Fixtures','KITCHEN_BREAKROOMS','PERIODIC','MEDIUM',3.75,'EACH',1.20,'1.2 Each','Clean and sanitize sink drains and fixtures.'),
  ('KB06R','Replace Breakroom Liners','KITCHEN_BREAKROOMS','ROUTINE','LOW',0.25,'EACH',1.00,'1 Each','Replace all trash liners in breakroom bins.'),

  -- Windows & Glass
  ('WG01P','Detail Interior Glass Panels','WINDOWS_GLASS','PERIODIC','MEDIUM',5.00,'SQFT_1000',900,'900 Per Thousand Sq. Ft.','Clean interior glass walls and partitions.'),
  ('WG02P','Spot Clean Fingerprints','WINDOWS_GLASS','ROUTINE','LOW',1.00,'EACH',3.00,'3 Each','Remove fingerprints from doors and glass touchpoints.'),
  ('WG03P','Clean Exterior Entry Glass','WINDOWS_GLASS','PROJECT','MEDIUM',6.00,'EACH',1.00,'1 Each','Clean exterior side of entry glass and transoms.'),
  ('WG04P','Polish Mirror Surfaces','WINDOWS_GLASS','PERIODIC','LOW',2.00,'EACH',2.00,'2 Each','Polish mirrors to a streak-free finish.'),
  ('WG05P','Scrape Adhesive Residue','WINDOWS_GLASS','PROJECT','HIGH',2.75,'EACH',1.00,'1 Each','Remove sticker/adhesive residue from glass.'),
  ('WG06P','Frame and Sill Detailing','WINDOWS_GLASS','PERIODIC','LOW',2.50,'EACH',1.00,'1 Each','Detail window frames, tracks, and sills.'),

  -- Safety & PPE
  ('SP01R','Check Wet Floor Signage','SAFETY_PPE','ROUTINE','HIGH',0.50,'EACH',2.00,'2 Each','Set and retrieve safety signage during floor work.'),
  ('SP02R','Inspect PPE Compliance','SAFETY_PPE','ROUTINE','HIGH',1.00,'EACH',1.00,'1 Each','Verify proper PPE use before task execution.'),
  ('SP03R','Refill PPE Stations','SAFETY_PPE','ROUTINE','MEDIUM',1.50,'EACH',2.00,'2 Each','Restock gloves, masks, and hand sanitizer stations.'),
  ('SP04R','Document Safety Hazards','SAFETY_PPE','ROUTINE','HIGH',1.25,'EACH',1.00,'1 Each','Capture hazards and report through safety log.'),
  ('SP05R','Sanitize Shared Equipment Handles','SAFETY_PPE','ROUTINE','MEDIUM',1.00,'EACH',3.00,'3 Each','Disinfect common-touch equipment handles.'),
  ('SP06R','Dispose of Biohazard Waste','SAFETY_PPE','ROUTINE','HIGH',2.25,'EACH',1.00,'1 Each','Bag and stage biohazard waste per protocol.'),

  -- Stairs, Elevators, Escalators
  ('SE01R','Sweep Stairwells','STAIRS_ELEVATORS_ESCALATORS','ROUTINE','MEDIUM',4.00,'SQFT_1000',650,'650 Per Thousand Sq. Ft.','Sweep and spot clean stair landings and treads.'),
  ('SE02R','Mop Stair Treads','STAIRS_ELEVATORS_ESCALATORS','ROUTINE','MEDIUM',6.00,'SQFT_1000',500,'500 Per Thousand Sq. Ft.','Mop stair treads and landings safely.'),
  ('SE03R','Clean Elevator Buttons and Panels','STAIRS_ELEVATORS_ESCALATORS','ROUTINE','HIGH',1.50,'EACH',2.00,'2 Each','Disinfect elevator control panels and handrails.'),
  ('SE04P','Detail Elevator Tracks','STAIRS_ELEVATORS_ESCALATORS','PERIODIC','LOW',3.50,'EACH',1.00,'1 Each','Vacuum and wipe elevator door tracks.'),
  ('SE05P','Escalator Side Panel Cleaning','STAIRS_ELEVATORS_ESCALATORS','PERIODIC','MEDIUM',5.50,'EACH',1.00,'1 Each','Clean escalator glass and side panels.'),
  ('SE06R','Dust Stair Railings','STAIRS_ELEVATORS_ESCALATORS','ROUTINE','LOW',2.00,'EACH',2.00,'2 Each','Dust and disinfect hand railings.'),

  -- Medical
  ('MD01R','Disinfect High-Touch Surfaces','MEDICAL','ROUTINE','HIGH',4.50,'EACH',2.00,'2 Each','Disinfect approved high-touch points in medical spaces.'),
  ('MD02R','Terminal Clean Exam Room','MEDICAL','PERIODIC','HIGH',18.00,'EACH',1.00,'1 Each','Perform terminal clean of exam room surfaces and floor.'),
  ('MD03R','Restock Clinical Consumables','MEDICAL','ROUTINE','MEDIUM',2.25,'EACH',2.00,'2 Each','Restock approved clinical consumables and disposables.'),
  ('MD04R','Disinfect Waiting Area Chairs','MEDICAL','ROUTINE','MEDIUM',3.00,'EACH',2.00,'2 Each','Disinfect armrests and seat surfaces in waiting areas.'),
  ('MD05P','Biohazard Touchpoint Audit','MEDICAL','PERIODIC','HIGH',2.75,'EACH',1.00,'1 Each','Audit and verify biohazard touchpoint sanitation.'),
  ('MD06R','Clean Nurse Station Counters','MEDICAL','ROUTINE','MEDIUM',3.25,'EACH',1.00,'1 Each','Disinfect nurse station work surfaces.'),

  -- Supervision and Miscellaneous
  ('SM01R','Pre-Shift Scope Review','SUPERVISION_MISC','ROUTINE','MEDIUM',2.00,'EACH',1.00,'1 Each','Review scope, priorities, and safety before shift.'),
  ('SM02R','Post-Shift Quality Walk','SUPERVISION_MISC','ROUTINE','HIGH',4.00,'EACH',1.00,'1 Each','Complete supervisor quality walk and sign-off.'),
  ('SM03R','Client Communication Log Update','SUPERVISION_MISC','ROUTINE','MEDIUM',1.50,'EACH',1.00,'1 Each','Log client notes, concerns, and follow-ups.'),
  ('SM04R','Supply Usage Reconciliation','SUPERVISION_MISC','ROUTINE','MEDIUM',2.25,'EACH',1.00,'1 Each','Reconcile supply usage and note low-stock alerts.'),
  ('SM05P','Monthly Scope Optimization Review','SUPERVISION_MISC','PERIODIC','LOW',12.00,'EACH',1.00,'1 Each','Review and optimize recurring scope of work.'),
  ('SM06R','Training Reinforcement Huddle','SUPERVISION_MISC','ROUTINE','LOW',3.00,'EACH',1.00,'1 Each','Deliver short reinforcement huddle on standards.'),

  -- Additional common commercial tasks
  ('AD01R','Clean Entry Mats','GENERAL_FLOORS','ROUTINE','LOW',2.50,'EACH',1.00,'1 Each','Vacuum and straighten entry mats.'),
  ('AD02R','Disinfect Door Handles','FURNITURE_DETAIL','ROUTINE','HIGH',1.75,'EACH',3.00,'3 Each','Disinfect all high-touch door hardware.'),
  ('AD03R','Spot Dust Baseboards','FURNITURE_DETAIL','ROUTINE','LOW',3.25,'SQFT_1000',950,'950 Per Thousand Sq. Ft.','Spot dust baseboards and lower ledges.'),
  ('AD04P','Deep Dust Ceiling Vents','FURNITURE_DETAIL','PERIODIC','MEDIUM',6.25,'EACH',1.00,'1 Each','Remove dust from high ceiling vents.'),
  ('AD05R','Sanitize Shared Phones','FURNITURE_DETAIL','ROUTINE','MEDIUM',1.00,'EACH',4.00,'4 Each','Sanitize shared office phones and touch screens.'),
  ('AD06R','Clean Lobby Furniture','FURNITURE_DETAIL','ROUTINE','MEDIUM',4.25,'EACH',1.00,'1 Each','Wipe and sanitize lobby seating surfaces.')
)
INSERT INTO public.tasks (
  tenant_id,
  task_code,
  name,
  category,
  subcategory,
  priority_level,
  default_minutes,
  unit_code,
  production_rate_sqft_per_hour,
  production_rate,
  description,
  spec_description,
  work_description,
  is_active,
  status,
  notes
)
SELECT
  tt.id,
  s.task_code,
  s.name,
  s.category,
  s.subcategory,
  s.priority_level,
  s.default_minutes,
  s.unit_code,
  s.production_rate_sqft_per_hour,
  s.production_rate,
  s.description,
  s.description,
  s.description,
  true,
  'ACTIVE',
  'Seeded from 2026 Task Catalog library migration.'
FROM target_tenant tt
CROSS JOIN seed s
ON CONFLICT (task_code)
DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  subcategory = EXCLUDED.subcategory,
  priority_level = EXCLUDED.priority_level,
  default_minutes = EXCLUDED.default_minutes,
  unit_code = EXCLUDED.unit_code,
  production_rate_sqft_per_hour = EXCLUDED.production_rate_sqft_per_hour,
  production_rate = EXCLUDED.production_rate,
  description = EXCLUDED.description,
  spec_description = EXCLUDED.spec_description,
  work_description = EXCLUDED.work_description,
  is_active = true,
  status = 'ACTIVE',
  updated_at = now();

COMMIT;
