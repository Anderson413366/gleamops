# Catalog Module Reference

## Field Dictionary

### Service Plan

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| id | UUID | Auto | System-generated | Unique service plan identifier |
| tenant_id | UUID | Auto | Valid tenant | Owning tenant |
| name | string | Yes | 1-200 chars | Service plan name |
| description | text | No | Max 2000 chars | Detailed description of what the plan includes |
| category | string | No | 1-100 chars | Service category (e.g. "Janitorial", "Floor Care") |
| base_rate | decimal | No | >= 0 | Default rate for this plan |
| rate_type | Enum | No | `per_visit`, `per_hour`, `monthly`, `per_sqft` | How the rate is applied |
| frequency_default | Enum | No | `daily`, `weekly`, `biweekly`, `monthly`, `one-time` | Default recurrence |
| estimated_hours | decimal | No | > 0 | Default estimated hours |
| is_active | boolean | Yes | true/false | Whether plan is available for selection |
| tasks | JSON | No | Valid task array | Checklist of tasks included in the plan |
| supplies_needed | UUID[] | No | Valid supply IDs | Required supplies from inventory |
| equipment_needed | UUID[] | No | Valid equipment IDs | Required equipment |
| created_at | timestamp | Auto | System-generated | Record creation time |
| updated_at | timestamp | Auto | System-generated | Last modification time |

### Task Template

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| id | UUID | Auto | System-generated | Unique task identifier |
| service_plan_id | UUID | Yes | Valid service plan | Parent service plan |
| name | string | Yes | 1-200 chars | Task name |
| description | text | No | Max 500 chars | Task instructions |
| sort_order | integer | Yes | >= 0 | Display order in checklist |
| is_required | boolean | Yes | true/false | Whether task must be completed |

## Statuses / Enums

### Active Status

| Status | Color | Description | Transitions To |
|--------|-------|-------------|----------------|
| Active (is_active=true) | green | Plan is available for use in jobs | Inactive |
| Inactive (is_active=false) | gray | Plan is hidden from new job creation | Active |

### Rate Type Enum

| Value | Color | Description | Transitions To |
|-------|-------|-------------|----------------|
| per_visit | -- | Flat rate per service visit | Any |
| per_hour | -- | Billed by the hour | Any |
| monthly | -- | Fixed monthly billing | Any |
| per_sqft | -- | Rate multiplied by site square footage | Any |

### Frequency Default Enum

| Value | Color | Description | Transitions To |
|-------|-------|-------------|----------------|
| daily | -- | Service performed every day | Any |
| weekly | -- | Service performed once per week | Any |
| biweekly | -- | Service performed every two weeks | Any |
| monthly | -- | Service performed once per month | Any |
| one-time | -- | Single occurrence service | Any |

## Button Inventory

| Button Label | Location | Action | Role Required |
|--------------|----------|--------|---------------|
| + New Service Plan | Catalog list toolbar | Open service plan creation form | Manager, Admin, Owner |
| Edit Plan | Plan detail toolbar | Open service plan edit form | Manager, Admin, Owner |
| Deactivate | Plan detail toolbar | Set is_active to false | Admin, Owner |
| Activate | Plan detail toolbar | Set is_active to true | Admin, Owner |
| Duplicate Plan | Plan detail action menu | Create a copy of the service plan | Manager, Admin, Owner |
| + Add Task | Plan detail / Tasks section | Add a task to the plan checklist | Manager, Admin, Owner |
| Edit Task | Task row | Edit task details inline or via dialog | Manager, Admin, Owner |
| Delete Task | Task row action menu | Remove task from plan | Manager, Admin, Owner |
| Reorder Tasks | Tasks section | Drag-and-drop to reorder tasks | Manager, Admin, Owner |
| Back to Catalog | Plan detail breadcrumb | Navigate to `/catalog` | Any |
| Filter by Category | Catalog list filter bar | Filter plans by service category | Any |
| Search | Catalog list search bar | Search plans by name or description | Any |
