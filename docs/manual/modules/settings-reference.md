# Settings Module Reference

## Field Dictionary

### Company Profile

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| id | UUID | Auto | System-generated | Tenant identifier |
| company_name | string | Yes | 1-200 chars | Business legal name |
| display_name | string | No | 1-200 chars | Display name (if different from legal) |
| phone | string | No | Valid phone format | Main business phone |
| email | string | No | Valid email format | Main business email |
| website | string | No | Valid URL | Company website |
| address_line1 | string | No | 1-200 chars | Business address street |
| address_line2 | string | No | Max 200 chars | Suite, unit |
| city | string | No | 1-100 chars | City |
| state | string | No | 2-char state code | State abbreviation |
| zip | string | No | 5 or 9 digit ZIP | Postal code |
| logo_url | string | No | Valid URL | Company logo image URL |
| timezone | string | Yes | Valid IANA timezone | Default timezone |
| currency | string | Yes | ISO 4217 code | Default currency (e.g. "USD") |
| updated_at | timestamp | Auto | System-generated | Last modification time |

### User Account

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| id | UUID | Auto | System-generated | User identifier |
| email | string | Yes | Valid email, unique | Login email |
| full_name | string | Yes | 1-150 chars | Display name |
| avatar_url | string | No | Valid URL | Profile photo URL |
| theme | Enum | No | `light`, `dark`, `system` | UI theme preference |
| notifications_enabled | boolean | Yes | true/false | Whether to receive notifications |
| updated_at | timestamp | Auto | System-generated | Last modification time |

### Notification Preferences

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| email_new_ticket | boolean | Yes | true/false | Email on new ticket creation |
| email_ticket_complete | boolean | Yes | true/false | Email on ticket completion |
| email_schedule_published | boolean | Yes | true/false | Email when schedule is published |
| email_safety_issue | boolean | Yes | true/false | Email on new safety issue |
| push_shift_reminder | boolean | Yes | true/false | Push notification for shift reminders |
| push_schedule_change | boolean | Yes | true/false | Push notification for schedule changes |

## Statuses / Enums

### Theme Enum

| Value | Color | Description | Transitions To |
|-------|-------|-------------|----------------|
| light | -- | Light color scheme | dark, system |
| dark | -- | Dark color scheme | light, system |
| system | -- | Follow OS preference | light, dark |

### Timezone Enum (Common)

| Value | Color | Description | Transitions To |
|-------|-------|-------------|----------------|
| America/New_York | -- | Eastern Time | Any |
| America/Chicago | -- | Central Time | Any |
| America/Denver | -- | Mountain Time | Any |
| America/Los_Angeles | -- | Pacific Time | Any |

## Button Inventory

| Button Label | Location | Action | Role Required |
|--------------|----------|--------|---------------|
| Save Changes | Company profile form | Save company profile updates | Admin, Owner |
| Upload Logo | Company profile form | Open file picker for logo upload | Admin, Owner |
| Remove Logo | Company profile form | Remove current company logo | Admin, Owner |
| Save Profile | User account form | Save user profile changes | Any (own profile) |
| Change Password | User account section | Open password change dialog | Any (own profile) |
| Upload Avatar | User account form | Open file picker for avatar upload | Any (own profile) |
| Save Notifications | Notification prefs form | Save notification preferences | Any (own profile) |
| Invite User | Team settings section | Send invitation email to new user | Admin, Owner |
| Remove User | Team settings user row | Remove user access with confirmation | Admin, Owner |
| Change Role | Team settings user row | Update user's application role | Admin, Owner |
| Manage Subscription | Billing section | Navigate to billing/subscription management | Owner |
| View Audit Log | Audit section | View system audit log entries | Admin, Owner |
| Back to Settings | Settings sub-page breadcrumb | Navigate to `/settings` | Any |
