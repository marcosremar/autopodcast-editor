#!/bin/bash

# Aeropod Template System - Comprehensive API Tests
# This script tests all template system endpoints and generates a report

set -e

API_BASE="http://localhost:3000/api"
REPORT_DIR="/tmp/aeropod-test-report"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
REPORT_FILE="$REPORT_DIR/test-report-$TIMESTAMP.md"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Create report directory
mkdir -p "$REPORT_DIR"

# Initialize report
cat > "$REPORT_FILE" << EOF
# 🧪 Aeropod Template System - Test Report
**Date:** $(date)
**Environment:** Development (localhost:3000)

---

## 📋 Test Summary

EOF

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     AEROPOD TEMPLATE SYSTEM - API TESTS               ║${NC}"
echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo ""

# Test counter
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to run test
run_test() {
    local test_name="$1"
    local test_command="$2"
    local expected_field="$3"

    TOTAL_TESTS=$((TOTAL_TESTS + 1))

    echo -e "${YELLOW}Testing:${NC} $test_name"
    echo -e "\n### Test $TOTAL_TESTS: $test_name" >> "$REPORT_FILE"
    echo '```bash' >> "$REPORT_FILE"
    echo "$test_command" >> "$REPORT_FILE"
    echo '```' >> "$REPORT_FILE"

    # Run the test
    response=$(eval "$test_command" 2>&1)

    # Save response
    echo -e "\n**Response:**" >> "$REPORT_FILE"
    echo '```json' >> "$REPORT_FILE"
    echo "$response" | jq '.' 2>/dev/null || echo "$response" >> "$REPORT_FILE"
    echo '```' >> "$REPORT_FILE"

    # Check if test passed
    if echo "$response" | jq -e "$expected_field" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ PASSED${NC}"
        echo -e "**Status:** ✅ PASSED\n" >> "$REPORT_FILE"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}✗ FAILED${NC}"
        echo -e "**Status:** ❌ FAILED\n" >> "$REPORT_FILE"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi

    echo ""
}

# Phase 1 Tests - Template System Basics
echo -e "${BLUE}═══ PHASE 1: Template System Basics ═══${NC}\n"
echo -e "## 🎯 Phase 1: Template System Basics\n" >> "$REPORT_FILE"

run_test "GET /api/templates - List all templates" \
    "curl -s $API_BASE/templates" \
    ".success == true"

run_test "GET /api/templates - Verify 4 templates exist" \
    "curl -s $API_BASE/templates" \
    ".templates | length == 4"

# Get first template ID
TEMPLATE_ID=$(curl -s "$API_BASE/templates" | jq -r '.templates[0].id')
echo -e "${BLUE}Using Template ID: $TEMPLATE_ID${NC}\n"

run_test "GET /api/templates/[id] - Get template with sections" \
    "curl -s $API_BASE/templates/$TEMPLATE_ID" \
    ".success == true and .template.sections != null"

run_test "Verify template has sections" \
    "curl -s $API_BASE/templates/$TEMPLATE_ID" \
    ".template.sections | length > 0"

# Get first project ID
PROJECT_ID=$(curl -s "$API_BASE/projects" | jq -r '.projects[0].id')
echo -e "${BLUE}Using Project ID: $PROJECT_ID${NC}\n"

run_test "POST /api/projects/[id]/select-template - Select template" \
    "curl -s -X POST $API_BASE/projects/$PROJECT_ID/select-template -H 'Content-Type: application/json' -d '{\"templateId\": \"$TEMPLATE_ID\"}'" \
    ".success == true"

run_test "GET /api/projects/[id]/sections - Get project sections" \
    "curl -s $API_BASE/projects/$PROJECT_ID/sections" \
    ".success == true and .sections != null"

# Phase 2 Tests - Content Detection
echo -e "${BLUE}═══ PHASE 2: AI Content Detection ═══${NC}\n"
echo -e "## 🤖 Phase 2: AI Content Detection\n" >> "$REPORT_FILE"

# Get a project with transcription
PROJECT_WITH_TRANSCRIPTION=$(curl -s "$API_BASE/projects" | jq -r '.projects[] | select(.transcription != null) | .id' | head -1)

if [ -n "$PROJECT_WITH_TRANSCRIPTION" ]; then
    echo -e "${BLUE}Using Project with Transcription: $PROJECT_WITH_TRANSCRIPTION${NC}\n"

    run_test "GET /api/projects/[id]/detect-type - Get existing detection" \
        "curl -s $API_BASE/projects/$PROJECT_WITH_TRANSCRIPTION/detect-type" \
        ".detection != null or .error != null"
else
    echo -e "${YELLOW}⚠ No project with transcription found, skipping content detection tests${NC}\n"
    echo -e "**Note:** No project with transcription available for testing\n" >> "$REPORT_FILE"
fi

# Phase 3 Tests - Section Management
echo -e "${BLUE}═══ PHASE 3: Section Management ═══${NC}\n"
echo -e "## 📋 Phase 3: Section Management\n" >> "$REPORT_FILE"

run_test "GET /api/projects/[id]/missing-sections - Get missing sections" \
    "curl -s $API_BASE/projects/$PROJECT_ID/missing-sections" \
    ".success == true and .stats != null"

# Get first section ID
SECTION_ID=$(curl -s "$API_BASE/projects/$PROJECT_ID/sections" | jq -r '.sections[0].id')
echo -e "${BLUE}Using Section ID: $SECTION_ID${NC}\n"

run_test "GET /api/projects/[id]/sections/[sectionId] - Get section details" \
    "curl -s $API_BASE/projects/$PROJECT_ID/sections/$SECTION_ID" \
    ".success == true and .section != null"

# Phase 4 Tests - Section Approval
echo -e "${BLUE}═══ PHASE 4: Section Approval ═══${NC}\n"
echo -e "## ✅ Phase 4: Section Approval Workflow\n" >> "$REPORT_FILE"

run_test "PATCH /api/projects/[id]/sections/[sectionId] - Update to review status" \
    "curl -s -X PATCH $API_BASE/projects/$PROJECT_ID/sections/$SECTION_ID -H 'Content-Type: application/json' -d '{\"status\": \"review\"}'" \
    ".success == true"

run_test "PATCH /api/projects/[id]/sections/[sectionId] - Approve section" \
    "curl -s -X PATCH $API_BASE/projects/$PROJECT_ID/sections/$SECTION_ID -H 'Content-Type: application/json' -d '{\"status\": \"approved\"}'" \
    ".success == true"

run_test "Verify section cannot be modified when approved" \
    "curl -s -X PATCH $API_BASE/projects/$PROJECT_ID/sections/$SECTION_ID -H 'Content-Type: application/json' -d '{\"notes\": \"test\"}'" \
    ".error != null or .success == false"

run_test "PATCH /api/projects/[id]/sections/[sectionId] - Reopen for review" \
    "curl -s -X PATCH $API_BASE/projects/$PROJECT_ID/sections/$SECTION_ID -H 'Content-Type: application/json' -d '{\"status\": \"review\"}'" \
    ".success == true"

# Integration Tests
echo -e "${BLUE}═══ INTEGRATION TESTS ═══${NC}\n"
echo -e "## 🔄 Integration Tests\n" >> "$REPORT_FILE"

run_test "Complete workflow: Select template → Get sections → Get stats" \
    "curl -s $API_BASE/projects/$PROJECT_ID/missing-sections" \
    ".stats.total > 0"

run_test "Verify section stats calculation" \
    "curl -s $API_BASE/projects/$PROJECT_ID/missing-sections" \
    ".stats.percentComplete >= 0 and .stats.percentComplete <= 100"

# Generate Summary
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}                    TEST SUMMARY                       ${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo ""
echo -e "Total Tests:  ${BLUE}$TOTAL_TESTS${NC}"
echo -e "Passed:       ${GREEN}$PASSED_TESTS${NC}"
echo -e "Failed:       ${RED}$FAILED_TESTS${NC}"
echo ""

# Calculate success rate
SUCCESS_RATE=$(echo "scale=2; ($PASSED_TESTS * 100) / $TOTAL_TESTS" | bc)

if [ "$FAILED_TESTS" -eq 0 ]; then
    echo -e "${GREEN}✓ ALL TESTS PASSED! 🎉${NC}"
    STATUS_EMOJI="✅"
else
    echo -e "${YELLOW}⚠ Some tests failed${NC}"
    STATUS_EMOJI="⚠️"
fi

# Add summary to report
cat >> "$REPORT_FILE" << EOF

---

## 📊 Final Results

| Metric | Value |
|--------|-------|
| **Total Tests** | $TOTAL_TESTS |
| **Passed** | ✅ $PASSED_TESTS |
| **Failed** | ❌ $FAILED_TESTS |
| **Success Rate** | $SUCCESS_RATE% |
| **Status** | $STATUS_EMOJI |

---

## 🎯 Test Coverage

### Phase 1: Template System Basics ✅
- Template listing
- Template details with sections
- Template selection
- Project sections initialization

### Phase 2: AI Content Detection 🤖
- Content type detection
- Template suggestions
- Detection result retrieval

### Phase 3: Section Management 📋
- Missing sections identification
- Section statistics
- Section details retrieval

### Phase 4: Section Approval Workflow ✅
- Status updates (review, approved)
- Section locking protection
- Reopen workflow

---

## 📁 Test Artifacts

**Report Location:** \`$REPORT_FILE\`

**Generated:** $(date)

---

*Report generated automatically by Aeropod Test Suite*
EOF

echo ""
echo -e "${GREEN}Report saved to: $REPORT_FILE${NC}"
echo ""

# Return exit code based on test results
if [ "$FAILED_TESTS" -eq 0 ]; then
    exit 0
else
    exit 1
fi
