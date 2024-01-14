import resend
import traceback
import yaml

with open(".env.yaml", "r") as f:
    env = yaml.safe_load(f)

resend.api_key = env["resend_api_key"]


async def send_email(from_email="agents@defog.ai", to_email="", params={}):
    err = None
    try:
        r = resend.Emails.send(
            {
                "from": from_email,
                "to": to_email,
                "subject": "Your report is ready!",
                "html": f"Your report is available <a href={'https://defog.ai/accounts/report/?reportId=' + params['report_id']}>here.</a>",
            }
        )
        return err
    except Exception as e:
        print(e)
        tback = traceback.format_exc()
        err = e + "\n" + tback
        return err
