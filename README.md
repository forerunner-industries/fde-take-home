# Permit System API

This is a simple Express server that simulates a third-party permit management system API with intentional issues to test integration resilience.

## Features

- RESTful API to access permit data
- Pagination with filtering capabilities
- Simulated real-world integration challenges including rate limiting and occasional errors

## Running with Docker

```bash
npm run docker:build
npm run docker:run
```

Alternatively, build and run in one step:

```bash
npm run docker:start
```

The API will be available at http://localhost:3000/v1/permits

## API Documentation

The API is documented in the OpenAPI specification file located at
[permit-system-api.yaml](./permit-system-api.yaml).

Please refer to this file for detailed endpoint documentation and data schemas.

## Simulated Issues

- Rate limiting: After 5 consecutive requests within 10 seconds
- Random server errors: 20% chance of a 500 error on any request
