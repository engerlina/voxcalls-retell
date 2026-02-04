# Lessons Learned

This file captures patterns from corrections to prevent repeated mistakes.

---

## Session: 2026-02-05

*No lessons yet - project initialization*

---

## Permanent Rules

These rules should be checked at the start of every session:

1. Always verify files exist before operating on them
2. Run tests after every code change
3. Don't assume - check the actual code
4. Always verify 11Labs API capabilities before promising features
5. Multi-tenancy is OUR responsibility - 11Labs won't provide it

---

## 11Labs-Specific Rules

1. **Check API rate limits** before designing batch operations
2. **Verify phone number support** - this may require Twilio/Vonage integration
3. **Knowledge base isolation** - must implement namespace separation ourselves
4. **Agent configuration** - map our settings to 11Labs agent parameters
