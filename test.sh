#!/bin/bash

# =============================================================================
# testMuBrowser - Test Runner Script
# =============================================================================
# 
# Run all example tests with LambdaTest cloud automation.
#
# Prerequisites:
#   export LT_USERNAME=your_username
#   export LT_ACCESS_KEY=your_access_key
#
# Usage:
#   ./test.sh          # Run all tests
#   ./test.sh quick    # Run quick local tests only
#   ./test.sh cloud    # Run LambdaTest cloud tests only
#   ./test.sh build    # Build only, no tests
#
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0
SKIPPED=0

# Results array
declare -a RESULTS

# Print header
print_header() {
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  testMuBrowser - Test Runner${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    echo ""
}

# Print section
print_section() {
    echo ""
    echo -e "${YELLOW}────────────────────────────────────────────────────────────────${NC}"
    echo -e "${YELLOW}  $1${NC}"
    echo -e "${YELLOW}────────────────────────────────────────────────────────────────${NC}"
    echo ""
}

# Run a single test
run_test() {
    local name="$1"
    local file="$2"
    local timeout="${3:-180}"
    
    echo -e "${BLUE}▶ Running:${NC} $name"
    echo "  File: $file"
    echo "  Timeout: ${timeout}s"
    echo ""
    
    local start_time=$(date +%s)
    
    if timeout "$timeout" npx ts-node "$file" 2>&1; then
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        echo ""
        echo -e "${GREEN}✓ PASSED${NC} ($duration seconds)"
        PASSED=$((PASSED + 1))
        RESULTS+=("${GREEN}✓${NC} $name (${duration}s)")
    else
        local exit_code=$?
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        echo ""
        if [ $exit_code -eq 124 ]; then
            echo -e "${YELLOW}⏱ TIMEOUT${NC} (exceeded ${timeout}s)"
            SKIPPED=$((SKIPPED + 1))
            RESULTS+=("${YELLOW}⏱${NC} $name (timeout)")
        else
            echo -e "${RED}✗ FAILED${NC} (exit code: $exit_code, ${duration}s)"
            FAILED=$((FAILED + 1))
            RESULTS+=("${RED}✗${NC} $name (failed)")
        fi
    fi
    echo ""
}

# Check prerequisites
check_prerequisites() {
    print_section "Checking Prerequisites"
    
    # Check Node.js
    if command -v node &> /dev/null; then
        echo -e "${GREEN}✓${NC} Node.js: $(node --version)"
    else
        echo -e "${RED}✗${NC} Node.js not found"
        exit 1
    fi
    
    # Check npm
    if command -v npm &> /dev/null; then
        echo -e "${GREEN}✓${NC} npm: $(npm --version)"
    else
        echo -e "${RED}✗${NC} npm not found"
        exit 1
    fi
    
    # Check TypeScript
    if [ -f "node_modules/.bin/tsc" ]; then
        echo -e "${GREEN}✓${NC} TypeScript: installed"
    else
        echo -e "${YELLOW}!${NC} Installing dependencies..."
        npm install
    fi
    
    # Check LambdaTest credentials (for cloud tests)
    if [ -n "$LT_USERNAME" ] && [ -n "$LT_ACCESS_KEY" ]; then
        echo -e "${GREEN}✓${NC} LambdaTest: Credentials configured"
        echo "  Username: $LT_USERNAME"
    else
        echo -e "${YELLOW}!${NC} LambdaTest: Credentials not set (cloud tests will fail)"
        echo "  Set: export LT_USERNAME=your_username"
        echo "  Set: export LT_ACCESS_KEY=your_access_key"
    fi
}

# Build project
build_project() {
    print_section "Building Project"
    
    echo "Running: npm run build"
    if npm run build; then
        echo -e "${GREEN}✓${NC} Build successful"
    else
        echo -e "${RED}✗${NC} Build failed"
        exit 1
    fi
}

# Run TypeScript check
typecheck() {
    print_section "TypeScript Check"
    
    echo "Running: npx tsc --noEmit"
    if npx tsc --noEmit; then
        echo -e "${GREEN}✓${NC} TypeScript check passed"
    else
        echo -e "${RED}✗${NC} TypeScript errors found"
        exit 1
    fi
}

# Run quick local tests (no LambdaTest required)
run_quick_tests() {
    print_section "Quick Actions Tests (Local Chrome)"
    
    run_test "Quick Actions & Captcha" "examples/quick-actions-and-captcha.ts" 180
}

# Run cloud tests (LambdaTest required)
run_cloud_tests() {
    print_section "LambdaTest Cloud Tests"
    
    if [ -z "$LT_USERNAME" ] || [ -z "$LT_ACCESS_KEY" ]; then
        echo -e "${YELLOW}⏭ Skipping cloud tests - no LambdaTest credentials${NC}"
        SKIPPED=$((SKIPPED + 4))
        RESULTS+=("${YELLOW}⏭${NC} AI Agent Computer Actions (skipped)")
        RESULTS+=("${YELLOW}⏭${NC} Context and Profiles (skipped)")
        RESULTS+=("${YELLOW}⏭${NC} Full API Demo (skipped)")
        RESULTS+=("${YELLOW}⏭${NC} Steel Migration (skipped)")
        return
    fi
    
    run_test "AI Agent Computer Actions" "examples/ai-agent-computer-actions.ts" 180
    run_test "Context and Profiles" "examples/context-and-profiles.ts" 240
    run_test "Steel Migration" "examples/steel-migration.ts" 240
}

# Print summary
print_summary() {
    print_section "Test Results Summary"
    
    for result in "${RESULTS[@]}"; do
        echo -e "  $result"
    done
    
    echo ""
    echo -e "${BLUE}────────────────────────────────────────────────────────────────${NC}"
    local total=$((PASSED + FAILED + SKIPPED))
    echo -e "  Total:   $total"
    echo -e "  ${GREEN}Passed:${NC}  $PASSED"
    echo -e "  ${RED}Failed:${NC}  $FAILED"
    echo -e "  ${YELLOW}Skipped:${NC} $SKIPPED"
    echo -e "${BLUE}────────────────────────────────────────────────────────────────${NC}"
    echo ""
    
    if [ $FAILED -eq 0 ]; then
        echo -e "${GREEN}✅ All tests passed!${NC}"
        echo ""
        echo "View LambdaTest recordings at:"
        echo "  https://automation.lambdatest.com/"
        return 0
    else
        echo -e "${RED}❌ Some tests failed${NC}"
        return 1
    fi
}

# Main
main() {
    cd "$(dirname "$0")"
    
    print_header
    
    case "${1:-all}" in
        build)
            check_prerequisites
            build_project
            typecheck
            ;;
        quick)
            check_prerequisites
            build_project
            run_quick_tests
            print_summary
            ;;
        cloud)
            check_prerequisites
            build_project
            run_cloud_tests
            print_summary
            ;;
        all)
            check_prerequisites
            build_project
            run_quick_tests
            run_cloud_tests
            print_summary
            ;;
        *)
            echo "Usage: $0 [build|quick|cloud|all]"
            echo ""
            echo "  build  - Build project only"
            echo "  quick  - Run quick local tests (no LambdaTest)"
            echo "  cloud  - Run LambdaTest cloud tests"
            echo "  all    - Run all tests (default)"
            exit 1
            ;;
    esac
}

main "$@"
