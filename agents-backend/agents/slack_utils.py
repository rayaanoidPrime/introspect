from slack_sdk import WebClient
import traceback
import yaml

with open(".env.yaml", "r") as f:
    env = yaml.safe_load(f)

slack_client = WebClient(token=env["slack_token"])

def slack_message(channel = "agent-errors", message = "", params = {}):
    if channel == "":
        return

    try:
        param_str = '\n'.join([f"*{k}*: {v}" for k, v in params.items()])

        slack_client.chat_postMessage(
            channel=channel,
            text=f"""{message}\n\n{param_str}"""
        )
    except Exception as e:
        print(e)
        traceback.print_exc()
        traceback.print_exc()
        pass


