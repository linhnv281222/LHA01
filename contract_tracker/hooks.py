app_name = "contract_tracker"
app_title = "Contract Tracker"
app_publisher = "FaceNet"
app_description = "Theo doi hop dong"
app_email = "dev@example.com"
app_license = "mit"

# Giao diện Vue (Frappe UI) phục vụ ở /contracts; mọi đường dẫn con trả về cùng trang www/contracts.
website_route_rules = [
	{"from_route": "/contracts/<path:app_path>", "to_route": "contracts"},
	{"from_route": "/login", "to_route": "contracts"},
]

# Apps
# ------------------

# required_apps = []

# Each item in the list will be shown as an app in the apps page
add_to_apps_screen = [
	{
		"name": "contract_tracker",
		"logo": "/assets/contract_tracker/contract-tracker-logo.svg",
		"title": "Quản lý hợp đồng",
		"route": "/contracts",
		"has_permission": "contract_tracker.api.has_app_permission",
	}
]

# Trang chủ của người có vai trò của app (trừ Administrator): /contracts.
get_website_user_home_page = "contract_tracker.api.get_home_page"

# The dock, the rail down the left of the desk, is a document rather than a hook. Author it in
# Manage Dock on a developer-mode site and press Export to App, and it is written to
# `contract_tracker/dock/contract_tracker/contract_tracker.json` for git to carry. An app that ships none has no
# rail: its sidebar gets a switcher in the header instead.
#
# A companion app, one that extends a host app rather than standing on its own, says so with
# `mount_on` on that same record, and its entries are appended to the host's rail. Mounting keeps
# the companion off the apps screen, so it takes precedence over any add_to_apps_screen above.

# Includes in <head>
# ------------------

# include js, css files in header of desk.html
# app_include_css = "/assets/contract_tracker/css/contract_tracker.css"
# app_include_js = "/assets/contract_tracker/js/contract_tracker.js"

# include js, css files in header of web template
# web_include_css = "/assets/contract_tracker/css/contract_tracker.css"
# web_include_js = "/assets/contract_tracker/js/contract_tracker.js"

# include custom scss in every website theme (without file extension ".scss")
# website_theme_scss = "contract_tracker/public/scss/website"

# include js, css files in header of web form
# webform_include_js = {"doctype": "public/js/doctype.js"}
# webform_include_css = {"doctype": "public/css/doctype.css"}

# include js in page
# page_js = {"page" : "public/js/file.js"}

# include js in doctype views
# doctype_js = {"doctype" : "public/js/doctype.js"}
# doctype_list_js = {"doctype" : "public/js/doctype_list.js"}
# doctype_kanban_js = {"doctype" : "public/js/doctype_kanban.js"}
# doctype_tree_js = {"doctype" : "public/js/doctype_tree.js"}
# doctype_calendar_js = {"doctype" : "public/js/doctype_calendar.js"}

# Svg Icons
# ------------------
# include app icons in desk
# app_include_icons = "contract_tracker/public/icons.svg"

# Home Pages
# ----------

# application home page (will override Website Settings)
# home_page = "login"

# website user home page (by Role)
# role_home_page = {
# 	"Role": "home_page"
# }

# Generators
# ----------

# automatically create page for each record of this doctype
# website_generators = ["Web Page"]

# automatically load and sync documents of this doctype from downstream apps
# importable_doctypes = [doctype_1]

# Jinja
# ----------

# add methods and filters to jinja environment
# jinja = {
# 	"methods": "contract_tracker.utils.jinja_methods",
# 	"filters": "contract_tracker.utils.jinja_filters"
# }

# Installation
# ------------

before_install = "contract_tracker.setup.ensure_roles"
after_install = ["contract_tracker.setup.ensure_vat_rates", "contract_tracker.setup.ensure_print_formats"]

# Uninstallation
# ------------

# before_uninstall = "contract_tracker.uninstall.before_uninstall"
# after_uninstall = "contract_tracker.uninstall.after_uninstall"

# Integration Setup
# ------------------
# To set up dependencies/integrations with other apps
# Name of the app being installed is passed as an argument

# before_app_install = "contract_tracker.utils.before_app_install"
# after_app_install = "contract_tracker.utils.after_app_install"

# Integration Cleanup
# -------------------
# To clean up dependencies/integrations with other apps
# Name of the app being uninstalled is passed as an argument

# before_app_uninstall = "contract_tracker.utils.before_app_uninstall"
# after_app_uninstall = "contract_tracker.utils.after_app_uninstall"

# Build
# ------------------
# To hook into the build process

# after_build = "contract_tracker.build.after_build"

# To hook into the build process of other apps
# The list of apps being built is passed as an argument

# after_app_build = "contract_tracker.build.after_app_build"

# Desk Notifications
# ------------------
# See frappe.core.notifications.get_notification_config

# notification_config = "contract_tracker.notifications.get_notification_config"

# Awesome Bar
# -----------
# Extra search results: list of dicts with label, description, route, index.
# route: ["List", "ToDo"], "/desk/docs/some/page", or "https://example.com"
# awesomebar_search = ["contract_tracker.search.awesomebar_results"]

# Permissions
# -----------
# Permissions evaluated in scripted ways

# permission_query_conditions = {
# 	"Event": "frappe.desk.doctype.event.event.get_permission_query_conditions",
# }
#
# has_permission = {
# 	"Event": "frappe.desk.doctype.event.event.has_permission",
# }

# Document Events
# ---------------
# Hook on document methods and events

# doc_events = {
# 	"*": {
# 		"on_update": "method",
# 		"on_cancel": "method",
# 		"on_trash": "method"
# 	}
# }

# Scheduled Tasks
# ---------------

scheduler_events = {"daily": ["contract_tracker.tasks.daily"]}

# scheduler_events = {
# 	"all": [
# 		"contract_tracker.tasks.all"
# 	],
# 	"daily": [
# 		"contract_tracker.tasks.daily"
# 	],
# 	"hourly": [
# 		"contract_tracker.tasks.hourly"
# 	],
# 	"weekly": [
# 		"contract_tracker.tasks.weekly"
# 	],
# 	"monthly": [
# 		"contract_tracker.tasks.monthly"
# 	],
# }

# Testing
# -------

# before_tests = "contract_tracker.install.before_tests"

# Extend DocType Class
# ------------------------------
#
# Specify custom mixins to extend the standard doctype controller.
# extend_doctype_class = {
# 	"Task": "contract_tracker.custom.task.CustomTaskMixin"
# }

# Overriding Methods
# ------------------------------
#
# override_whitelisted_methods = {
# 	"frappe.desk.doctype.event.event.get_events": "contract_tracker.event.get_events"
# }
#
# each overriding function accepts a `data` argument;
# generated from the base implementation of the doctype dashboard,
# along with any modifications made in other Frappe apps
# override_doctype_dashboards = {
# 	"Task": "contract_tracker.task.get_dashboard_data"
# }

# exempt linked doctypes from being automatically cancelled
#
# auto_cancel_exempted_doctypes = ["Auto Repeat"]

# Ignore links to specified DocTypes when deleting documents
# -----------------------------------------------------------

# ignore_links_on_delete = ["Communication", "ToDo"]

# Request Events
# ----------------
# before_request = ["contract_tracker.utils.before_request"]
# after_request = ["contract_tracker.utils.after_request"]

# Job Events
# ----------
# before_job = ["contract_tracker.utils.before_job"]
# after_job = ["contract_tracker.utils.after_job"]

# User Data Protection
# --------------------

# user_data_fields = [
# 	{
# 		"doctype": "{doctype_1}",
# 		"filter_by": "{filter_by}",
# 		"redact_fields": ["{field_1}", "{field_2}"],
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_2}",
# 		"filter_by": "{filter_by}",
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_3}",
# 		"strict": False,
# 	},
# 	{
# 		"doctype": "{doctype_4}"
# 	}
# ]

# Authentication and authorization
# --------------------------------

# auth_hooks = [
# 	"contract_tracker.auth.validate"
# ]

# Automatically update python controller files with type annotations for this app.
# export_python_type_annotations = True

# default_log_clearing_doctypes = {
# 	"Logging DocType Name": 30  # days to retain logs
# }

# Translation
# ------------
# List of apps whose translatable strings should be excluded from this app's translations.
# ignore_translatable_strings_from = []

