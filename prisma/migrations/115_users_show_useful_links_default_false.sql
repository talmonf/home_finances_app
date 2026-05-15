-- New users: useful-links banner off unless super-admin enables it.
ALTER TABLE "users" ALTER COLUMN "show_useful_links" SET DEFAULT false;
