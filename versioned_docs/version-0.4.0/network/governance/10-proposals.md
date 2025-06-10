# Submitting Proposals

To submit a software upgrade proposal:

1. Prepare the proposal JSON:
```json
{
    "title": "Upgrade to Verana v2.0",
    "description": "This upgrade introduces new features.",
    "upgrade_plan": {
    "name": "v2.0-upgrade",
    "height": 1234567
    }
}
```

2.	Submit the proposal:

```bash
veranad tx gov submit-proposal software-upgrade "v2.0-upgrade" --from user
```