# slack-emoji-mode

Adds "Emoji-only mode" to slack. Non-emoji messages are be deleted when the mode is enabled.

Say `emoji on` to enable emoji mode. Say `emoji off` to disable emoji mode.

Requires an API token with admin privileges. Emoji mode works in whatever channels the API user is part of.

###Deploy

	npm install
	SLACK_API_TOKEN=admin-token-here node index
