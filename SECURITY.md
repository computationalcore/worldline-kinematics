# Security Policy

## Supported Versions

| Version | Supported |
| ------- | --------- |
| 0.x.x   | Yes       |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it by emailing computationalcore@gmail.com.

Please do not open a public issue for security vulnerabilities.

We will respond within 48 hours and work with you to understand and address the issue.

## Security Considerations

This project runs entirely in the browser:

- **No server-side data processing**: All calculations happen client-side
- **No data transmission**: Birth dates and location data never leave the browser
- **No cookies or tracking**: The application does not track users
- **No authentication**: There are no user accounts or credentials

The only external dependency that fetches data is `astronomy-engine`, which performs local calculations without network requests.
