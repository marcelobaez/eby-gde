# Nginx Configuration

This directory contains the nginx reverse proxy configuration for the eby-gde application.

## Configuration Overview

The nginx configuration uses **environment variable substitution** to support multiple environments (production, staging, development) without manual config file changes.

## Files

- **`default.conf.template`** - Template file with environment variable placeholders
- **`Dockerfile`** - Builds nginx container with template processing

## Environment Variables

The following environment variables must be set in the root `.env` file:

### `BACKEND_SERVER_NAME`
**Purpose:** Domain name(s) for the backend API server

**Examples:**
- Production: `gdeapi.eby.org.ar`
- Staging: `gdeapi-staging.eby.org.ar`
- Development: `gdeapi-dev.eby.org.ar` or `localhost`

### `FRONTEND_SERVER_NAME`
**Purpose:** Domain name(s) for the frontend application (space-separated if multiple)

**Examples:**
- Production: `www.expedientes.eby.org.ar expedientes.eby.org.ar`
- Staging: `expedientes-staging.eby.org.ar`
- Development: `expedientes-dev.eby.org.ar` or `localhost`

## How It Works

1. **Build time:** Dockerfile copies `default.conf.template` to `/etc/nginx/templates/`
2. **Container startup:** nginx:alpine automatically processes templates using `envsubst`
3. **Runtime:** Environment variables from docker-compose are substituted into the config
4. **Result:** `/etc/nginx/conf.d/default.conf` is generated with actual values

## Usage

### Production Setup

In your root `.env` file:
```bash
BACKEND_SERVER_NAME=gdeapi.eby.org.ar
FRONTEND_SERVER_NAME=www.expedientes.eby.org.ar expedientes.eby.org.ar
```

### Staging/Development Setup

In your root `.env` file:
```bash
BACKEND_SERVER_NAME=gdeapi-dev.eby.org.ar
FRONTEND_SERVER_NAME=expedientes-dev.eby.org.ar
```

### Local Development (No SSL)

In your root `.env` file:
```bash
BACKEND_SERVER_NAME=localhost
FRONTEND_SERVER_NAME=localhost
```

## SSL Certificates

SSL certificates are mounted from the `certs/` directory:
- `/etc/nginx/certs/eby.org.ar.chained.crt`
- `/etc/nginx/certs/eby.org.ar.key`

For local development without SSL, you may need to modify the template to conditionally include SSL configuration.

## Troubleshooting

### Check Generated Configuration

To see the actual nginx configuration with substituted values:

```bash
# View the generated config inside the running container
docker exec eby-gde-nginx-1 cat /etc/nginx/conf.d/default.conf
```

### Environment Variables Not Substituted

If you see `${BACKEND_SERVER_NAME}` in the generated config:
1. Check that variables are set in root `.env` file
2. Check that docker-compose.yml passes them to nginx service
3. Restart containers: `docker-compose down && docker-compose up --build`

### Server Name Mismatch

If nginx returns "default backend" or 404:
1. Check the `server_name` directive in generated config
2. Ensure your DNS/hosts file points to the correct domain
3. Match the `Host` header in your requests to the configured server name

## Modifying the Template

To add new configuration or change existing settings:

1. Edit `default.conf.template` (not `default.conf`)
2. Use `${VARIABLE_NAME}` syntax for environment variables
3. Add new variables to:
   - Root `.env.example`
   - `docker-compose.yml` nginx environment section
   - This README
4. Rebuild containers: `docker-compose up --build`

## References

- [nginx Docker Official Image](https://hub.docker.com/_/nginx)
- [nginx envsubst](https://github.com/docker-library/docs/tree/master/nginx#using-environment-variables-in-nginx-configuration-new-in-119)
- [nginx server_name directive](http://nginx.org/en/docs/http/server_names.html)
