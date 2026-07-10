from rest_framework.views import exception_handler
from rest_framework.response import Response


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if response is not None:
        errors = None
        if isinstance(response.data, dict):
            errors = {
                field: (msgs if isinstance(msgs, list) else [str(msgs)])
                for field, msgs in response.data.items()
            }

        return Response({
            'success': False,
            'message': str(exc.default_detail) if hasattr(exc, 'default_detail') else str(exc),
            'errors': errors or response.data,
        }, status=response.status_code)

    return response
