import { compileExpression } from 'filtrex';
import flatten from 'flat';
// Check if expression
export function checkCondition(expression, data) {
    const filter = compileExpression(expression);
    return filter(flatten(data));
}
// Get cookie
export function getCookie(store, name, url) {
    return store.getCookiesSync(url).filter(cookie => cookie.key === name)[0]?.value;
}
// Did all checks pass?
export function didChecksPass(stepResult) {
    if (!stepResult.checks)
        return true;
    return Object.values(stepResult.checks).map(check => {
        return check['passed'] ? check.passed : Object.values(check).map((c) => c.passed).every(passed => passed);
    })
        .every(passed => passed);
}
