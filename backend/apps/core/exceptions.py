import logging

from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework.exceptions import ParseError

logger = logging.getLogger(__name__)


def _extract_first_error(errors: dict) -> str:
    """Pull the first human-readable error message from an errors dict."""
    if not errors:
        return None
    for field, messages in errors.items():
        if isinstance(messages, list) and len(messages) > 0:
            return str(messages[0])
        elif isinstance(messages, str):
            return messages
    return None


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if response is not None:
        # A malformed body produces a json.JSONDecodeError whose text is
        # echoed straight back to the client ("Expecting property name
        # enclosed in double quotes: line 1 column 2"). That is parser
        # internals, not a useful validation message, so it is logged
        # server-side and replaced with something generic.
        if isinstance(exc, ParseError):
            logger.warning(
                "Malformed request body on %s %s: %s",
                context.get("request").method if context.get("request") else "?",
                context.get("request").path if context.get("request") else "?",
                exc,
            )
            return Response(
                {
                    'success': False,
                    'message': 'Malformed JSON request body.',
                    'errors': {'detail': ['Malformed JSON request body.']},
                },
                status=response.status_code,
            )

        errors = None
        if isinstance(response.data, dict):
            errors = {
                field: (msgs if isinstance(msgs, list) else [str(msgs)])
                for field, msgs in response.data.items()
            }

        # Build a descriptive message instead of generic "Invalid input."
        default_detail = str(exc.default_detail) if hasattr(exc, 'default_detail') else ''
        first_error = _extract_first_error(errors or {})
        if first_error and default_detail in ('Invalid input.', ''):
            message = first_error
        else:
            message = first_error or default_detail or str(exc)

        return Response({
            'success': False,
            'message': message,
            'errors': errors or response.data,
        }, status=response.status_code)

    return response
