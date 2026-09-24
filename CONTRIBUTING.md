# Contributing to EduPortal

Thank you for your interest in contributing to EduPortal! This document provides guidelines and instructions for contributing.

---

## Code of Conduct

By participating, you are expected to uphold this project's code of conduct. Please be respectful and constructive in all interactions.

---

## How to Contribute

### Reporting Bugs

Before creating a bug report:

1. Check existing issues to avoid duplicates
2. Use the [Bug Report template](.github/ISSUE_TEMPLATE/bug_report.yml)
3. Include:
   - Clear description of the bug
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details (no sensitive data)

### Suggesting Features

1. Check existing issues and discussions
2. Use the [Feature Request template](.github/ISSUE_TEMPLATE/feature_request.yml)
3. Explain:
   - The problem or need
   - Proposed solution
   - Alternative solutions considered

### Pull Requests

#### Process

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/your-feature`
3. **Make** your changes
4. **Run** tests to ensure nothing is broken
5. **Commit** with clear messages
6. **Push** to your fork
7. **Open** a Pull Request

#### Pull Request Checklist

- [ ] Code follows project style guidelines
- [ ] Lint passes: `npm run lint`
- [ ] TypeScript check passes: `npm run typecheck`
- [ ] Tests pass: `npm test`
- [ ] Build succeeds: `npm run build`
- [ ] No secrets or credentials committed
- [ ] Documentation updated (if needed)

---

## Development Setup

### Prerequisites

- Node.js 18+
- npm 9+

### Local Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/project-school.git
cd project-school

# Add upstream remote
git remote add upstream https://github.com/vanhkhuc-k5/project-school.git

# Install dependencies
npm install

# Create .env from template
cp .env.example .env

# Run seed (creates demo data)
npm run seed

# Start development servers
npm run dev:all
```

### Testing

```bash
# Run all tests
npm test

# Run specific test type
npm run test:unit
npm run test:integration
npm run test:browser
```

---

## Coding Standards

### JavaScript/Node.js

- Use ES modules (`import`/`export`)
- Follow existing code style
- Use meaningful variable names
- Add JSDoc comments for functions

### React Components

- Use functional components with hooks
- Follow existing component structure
- Use Tailwind CSS classes (as per DESIGN.md)
- Handle loading/error/empty states

### API Design

- RESTful conventions
- Consistent response format: `{ success, data, error, meta }`
- Zod validation for all inputs
- Proper error handling

### Security

- Never commit secrets or credentials
- Use parameterized queries (no string concatenation)
- Validate all user input
- Follow RBAC principles

---

## Project Structure

```
project_school/
├── src/                      # React Frontend
│   ├── components/           # Reusable components
│   ├── pages/                 # Page components
│   ├── layouts/              # Layout components
│   └── services/             # API client
│
├── server/                   # Express Backend
│   ├── modules/              # Feature modules
│   ├── middleware/           # Express middleware
│   └── shared/              # Shared utilities
│
├── tests/                   # Test Suite
│   ├── unit/                # Unit tests
│   ├── integration/         # Integration tests
│   └── e2e/                 # E2E tests
│
└── docs/                    # Documentation
```

---

## Documentation

Update documentation when:

- Adding new features
- Changing API endpoints
- Modifying database schemas
- Updating configuration

---

## Labels

| Label | Description |
|-------|-------------|
| `bug` | Bug reports |
| `enhancement` | Feature requests |
| `documentation` | Documentation improvements |
| `help wanted` | Seeking contributions |
| `good first issue` | Beginner-friendly issues |
| `security` | Security-related |

---

## Questions?

- **GitHub Discussions:** [Discussions](https://github.com/vanhkhuc-k5/project-school/discussions)
- **Issues:** [Issue Tracker](https://github.com/vanhkhuc-k5/project-school/issues)

---

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
