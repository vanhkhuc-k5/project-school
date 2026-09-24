# Browser E2E Tests - EduPortal

## G45 - Browser-level tests for highest-value workflows

### Overview

This directory contains Playwright-based browser E2E tests that verify multi-role workflows from the browser through to the backend API.

### Setup

1. Install dependencies:
```bash
npm install
npx playwright install chromium
```

2. Start the servers:
```bash
npm run server  # Backend on port 5000
npm run dev    # Frontend on port 5173
```

3. Run tests:
```bash
npx playwright test
```

### Test Categories

#### 1. Login Workflow (`Login Workflow`)
- Display login form with required fields
- Show validation errors for empty credentials
- Show error for invalid credentials
- Login successfully with valid credentials
- Maintain session after page reload

#### 2. Admin User Management (`Admin User Management`)
- Display user list
- Search for users by name
- Open create user dialog
- Create new user with valid data

#### 3. Admin Class Management (`Admin Class Management`)
- Display class list
- Create new class

#### 4. Teacher Assignment Workflow (`Teacher Assignment Workflow`)
- Display assignments page
- Open create assignment form
- Create assignment with questions
- Publish assignment

#### 5. Attendance Workflow (`Attendance Workflow`)
- Display attendance interface
- Mark student present
- Mark student absent with reason

#### 6. Student Submission Workflow (`Student Submission Workflow`)
- Display available assignments
- View assignment details
- Submit assignment answers

#### 7. Teacher Grading Workflow (`Teacher Grading Workflow`)
- Display pending submissions
- Grade student submission

#### 8. Student Grade Viewing (`Student Grade Viewing`)
- Display grades page
- Show grade details

#### 9. Parent Multi-Child Workflow (`Parent Multi-Child Workflow`)
- Display linked children
- Switch between children
- View selected child grades

#### 10. Parent Grade Viewing (`Parent Grade Viewing`)
- Display child grades
- Show detailed grade breakdown
- Prevent accessing other student grades

#### 11. Cross-Role Security (`Cross-Role Security`)
- Student cannot access admin dashboard
- Parent cannot access teacher pages
- Teacher cannot access other school data

#### 12. Accessibility (`Accessibility`)
- Login page has proper labels
- Forms have error messages announced
- Focus is visible on interactive elements

### Selector Strategy

These tests use a prioritized selector strategy:

1. **Accessible names**: `aria-label`, `data-testid`
2. **Semantic HTML**: `button[type="submit"]`, `input[type="email"]`
3. **Text content**: `text="Submit"`, `text=/error/i`
4. **Structural**: `table tbody tr`, `[role="table"]`

This avoids brittle CSS selectors and ensures tests remain stable through UI changes.

### Running Specific Tests

```bash
# Run all tests
npx playwright test

# Run specific test file
npx playwright test tests/browser/workflows.spec.js

# Run specific test
npx playwright test -g "should login successfully"

# Run with headed browser
npx playwright test --headed

# Run with UI mode
npx playwright test --ui
```

### Debugging

```bash
# Show trace viewer on failure
npx playwright test --trace on-first-retry

# Take screenshots on failure
npx playwright test --Screenshot on-failure

# Debug specific test
npx playwright test -g "test name" --debug
```

### CI Integration

The Playwright config is set up for CI:
- `forbidOnly: true` - Prevents `test.only`
- `retries: 2` in CI - Retries failed tests
- Screenshots and traces captured on failure

### Known Limitations

1. Tests require both backend (`npm run server`) and frontend (`npm run dev`) running
2. Tests use API-based login for speed (bypassing UI login form)
3. Some tests may need adjustment based on actual frontend implementation
4. Accessibility tests are basic - comprehensive a11y testing requires dedicated tools

### Adding New Tests

1. Add test to `workflows.spec.js` following the existing patterns
2. Use the helper functions from `helpers.js`
3. Follow the selector priority strategy
4. Include both positive and negative test cases
5. Add appropriate test isolation with `beforeEach`
