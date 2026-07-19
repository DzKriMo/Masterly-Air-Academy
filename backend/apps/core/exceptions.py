from rest_framework.views import exception_handler
from rest_framework.response import Response


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
