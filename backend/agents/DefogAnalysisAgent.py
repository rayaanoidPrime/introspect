from uuid import uuid4
from generic_utils import get_api_key_from_key_name
from db_utils import (
    get_analysis_data,
    initialise_analysis,
)


class DefogAnalysisAgent:
    """
    A class that helps run an anlaysis from start to finish.

    In some ways, this is a python version of the analysisManager component on the front end.

    It will let you:
    1. Create a new analysis
    2. Ask a question
    3. Get back clarifying questions
    """

    def __init__(self, token=None, key_name=None, analysis_id=None):
        if key_name is None:
            raise ValueError("key_name cannot be None")

        if token is None:
            raise ValueError("token cannot be None")

        self.key_name = key_name
        self.token = token
        self.api_key = get_api_key_from_key_name(key_name)

        if not self.api_key:
            raise ValueError("api_key not found")

        self.analysis_data = None

        if analysis_id:
            self.analysis_id = analysis_id

            err, analysis_data = get_analysis_data(analysis_id)
            if err:
                raise ValueError(err)

            self.analysis_data = analysis_data
        else:
            analysis_id = str(uuid4())
            # create a new analysis
            err, analysis_data = initialise_analysis(
                user_question="",
                token=self.token,
                api_key=self.api_key,
                custom_id=self.analysis_id,
                # TODO: allow for parent analyses here
                other_initialisation_details={},
            )
            if err:
                raise ValueError(err)
            self.analysis_data = analysis_data
