# Settings updates and recovery

## Visitor maintenance page

Browser requests during maintenance display `resources/views/errors/503.blade.php`.
This self-contained page needs no frontend build or external asset requests. The
503 status and Retry-After semantics remain; API requests still return JSON.
Only `/api/maintenance/notify` is exempt from the maintenance middleware.
Validated email requests are encrypted in private storage, deduplicated, and rate
limited using the file cache. The normal every-minute scheduler runs
`site:maintenance-notifications` after maintenance ends. Configure a working SMTP
mailer; log and array mailers do not consume requests. Failed deliveries retry,
and requests older than 30 days expire. These addresses are not added to marketing.
Delivery is at least once: a process interruption after SMTP accepts a message
but before removal of its request can cause a duplicate notification.
Do not use `artisan down --render` for this flow: Laravel's early pre-rendered
response bypasses the signup route. The existing deploy and recovery commands
use normal `artisan down` and support this page.

The admin Settings page queues updates, full backups, and restores. Only admins
can access these endpoints. Operations survive closing the browser and are
serialized with a private filesystem lock. Restores require typing RESTORE.

## One-time Linux/cPanel setup

Deploy this implementation using the existing cPanel procedure first. Configure:

```
SITE_MAINTENANCE_ENABLED=true
SITE_UPDATE_SOURCE=/home/bakhtech/repositories/Bakhtechlaravel
SITE_BACKUP_DIRECTORY=/home/bakhtech/.bakhtech-system
```

The backup directory must be outside every served document root, writable only
by the deployment user. Backups include secrets; never expose this directory.
The Git checkout must be separate from the live app. Configure Git authentication
on the host for private repositories, never through browser-supplied commands.

Install PHP CLI, Composer, Git, bash, tar, rsync, flock and (for MySQL) mysqldump
and mysql. The CLI PHP must match the web runtime and have the same extensions.
The database user needs permissions to dump routines, triggers, and events.
Configure cPanel cron to run every minute:

```
* * * * * cd /home/bakhtech/public_html && php artisan schedule:run >> /dev/null 2>&1
```

Run `php artisan optimize:clear` after configuring the environment. The worker is
`php artisan site:recovery-work`; the scheduler starts it in the background.
Windows execution is deliberately disabled: the deployment pipeline uses Linux tools.

## Behavior and limits

Update creates a safety backup then invokes the existing cPanel deployment
script: fetch main, stage and validate source, install locked production Composer
dependencies, migrate, check the database, rebuild caches, and verify admin runtime.
The project deploys committed frontend assets; build and commit them before pushing.
It does not install Node or compile frontend code on the production host.

Backups contain application files, .env, vendor, uploads, persistent storage, and a
MySQL dump or SQLite snapshot. Git metadata, node_modules, logs, framework runtime
files and generated caches are excluded. Backups remain on this host; arrange an
independent off-server copy for disaster recovery. No automatic retention deletes
backups. Monitor available disk space.

Restore accepts only local backups with verified SHA-256 checksums, creates a new
safety backup, replaces archived files and database records, and rebuilds caches.
It is an overlay restore: files or database tables created after the backup that
are absent from it are not removed. Use this on the same host/database configuration,
not to migrate environments. A failed restore leaves maintenance mode enabled for
operator recovery. Back up external services separately.

Maintenance mode blocks web writes, but does not stop independent queue workers,
external integrations, or database clients. Stop those writers before taking a
consistent production backup or restore. MySQL tables should use InnoDB.
Operations can take significant time and disk space. Each subprocess has a one-hour
timeout. A killed worker can leave a running status; inspect the private operation.json
and failure.log, ensure no process is active, and recover from the server terminal.
Never reset a running operation blindly. For failed restore recovery, use the retained
safety backup and verify the site before `php artisan up`.

Validate update and restore on a staging copy before enabling production operations.
