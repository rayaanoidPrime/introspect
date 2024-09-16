import pika
import os


def publish(queue_name: str, body):
    if not isinstance(body, str):
        raise ValueError(
            f"Error: body is not a string:\n{body}\nHave you serialized it to JSON?"
        )
    try:
        rabbitmq_host = os.environ.get("RABBITMQ_HOST", "localhost")
        parameters = pika.ConnectionParameters(host=rabbitmq_host)
        connection = pika.BlockingConnection(parameters)
        channel = connection.channel()
        channel.queue_declare(queue=queue_name)
        channel.basic_publish(
            exchange="",
            routing_key=queue_name,
            body=body,
        )
        connection.close()
    except Exception as e:
        print(f"Error while publishing message to queue {queue_name}:\n{e}")
