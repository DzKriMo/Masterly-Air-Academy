from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle


class ContactRateThrottle(AnonRateThrottle):
    scope = 'contact'


@api_view(['POST'])
@permission_classes([])  # Public
@throttle_classes([ContactRateThrottle])
def submit_contact(request):
    """Handle contact form + application submissions from the landing page."""
    from apps.notifications.models import Notification
    from apps.accounts.models import User

    form_type = request.data.get('type', 'contact')

    # --- Simple contact form ---
    if form_type == 'contact':
        name = request.data.get('name', '').strip()
        email = request.data.get('email', '').strip()
        phone = request.data.get('phone', '').strip()
        subject = request.data.get('subject', '').strip()
        message = request.data.get('message', '').strip()

        if not name or not email or not message:
            return Response({'error': 'Name, email, and message are required.'}, status=400)

        title = f"New Contact from {name}"
        body = f"Email: {email}\nPhone: {phone}\n\n{message}"

        admin_roles = ['system_admin', 'admin_responsible', 'admin_agent', 'admissions_responsible']
        admins = User.objects.filter(role__in=admin_roles, is_active=True)
        for admin in admins:
            Notification.objects.create(
                user=admin, type='contact_form', title=title, message=body,
                data={'name': name, 'email': email, 'phone': phone, 'subject': subject, 'type': 'contact'}
            )

        return Response({'success': True, 'message': 'Your message has been received. We will get back to you shortly.'})

    # --- Detailed application form ---
    import uuid
    from apps.students.models import Student
    from apps.administration.models import Application
    from apps.accounts.models import User as UserModel

    first_name = request.data.get('first_name', '').strip()
    last_name = request.data.get('last_name', '').strip()
    gender = request.data.get('gender', '').strip()
    date_of_birth = request.data.get('date_of_birth', '').strip()
    nationality = request.data.get('nationality', '').strip()
    phone = request.data.get('phone', '').strip()
    email = request.data.get('email', '').strip()
    english_proficiency = request.data.get('english_proficiency', '').strip()
    education_level = request.data.get('education_level', '').strip()
    source = request.data.get('source', '').strip()
    program = request.data.get('program', '').strip()
    notes = request.data.get('notes', '').strip()

    if not all([first_name, last_name, gender, date_of_birth, nationality, phone, email, english_proficiency, education_level, source, program]):
        return Response({'error': 'All required fields must be filled.'}, status=400)

    full_name = f"{first_name} {last_name}"
    title = f"New Application from {full_name}"
    body_parts = [
        f"Name: {full_name}", f"Gender: {gender}", f"DOB: {date_of_birth}",
        f"Nationality: {nationality}", f"Email: {email}", f"Phone: {phone}",
        f"English: {english_proficiency}", f"Education: {education_level}",
        f"Source: {source}", f"Program: {program}",
    ]
    if notes:
        body_parts.append(f"Notes: {notes}")
    body = "\n".join(body_parts)

    admin_roles = ['system_admin', 'admin_responsible', 'admin_agent', 'admissions_responsible']
    admins = User.objects.filter(role__in=admin_roles, is_active=True)
    for admin in admins:
        Notification.objects.create(
            user=admin, type='application', title=title, message=body,
            data={
                'first_name': first_name, 'last_name': last_name, 'gender': gender,
                'date_of_birth': date_of_birth, 'nationality': nationality,
                'phone': phone, 'email': email, 'english_proficiency': english_proficiency,
                'education_level': education_level, 'source': source, 'program': program,
                'notes': notes, 'type': 'application'
            }
        )

    uid = uuid.uuid4()
    cand_username = f'candidate_{uid.hex[:12]}'
    cand_email = email or f'{cand_username}@maa.dz'

    existing_user = UserModel.objects.filter(email=cand_email).first()

    if existing_user:
        if existing_user.role == 'candidate':
            user = existing_user
        else:
            cand_email = f'candidate_{uid.hex[:8]}__{email}' if email else f'{cand_username}@maa.dz'
            user = UserModel.objects.create_user(
                username=cand_username, email=cand_email,
                password=uuid.uuid4().hex[:12], role='candidate', status='pending',
                first_name=first_name, last_name=last_name,
            )
    else:
        user = UserModel.objects.create_user(
            username=cand_username, email=cand_email,
            password=uuid.uuid4().hex[:12], role='candidate', status='pending',
            first_name=first_name, last_name=last_name,
        )

    student, created = Student.objects.get_or_create(
        user=user,
        defaults={
            'student_number': f'APP-{uid.hex[:8].upper()}',
            'first_name': first_name,
            'last_name': last_name,
            'date_of_birth': date_of_birth or '2000-01-01',
            'enrollment_date': timezone.now().date(),
            'program': program or 'PPL',
            'status': 'pending',
            'phone': phone,
        }
    )
    if not created:
        student.first_name = first_name
        student.last_name = last_name
        student.date_of_birth = date_of_birth or student.date_of_birth
        student.phone = phone or student.phone
        if program:
            student.program = program
        student.save(update_fields=['first_name', 'last_name', 'date_of_birth', 'phone', 'program'])

    Application.objects.create(
        application_number=f'APP-{uuid.uuid4().hex[:8].upper()}',
        student=student,
        status='pending',
        notes=notes or '',
        documents=[{
            'type': 'application',
            'gender': gender, 'date_of_birth': date_of_birth, 'nationality': nationality,
            'english_proficiency': english_proficiency, 'education_level': education_level,
            'source': source, 'program': program, 'email': email, 'phone': phone,
            'notes': notes,
        }],
    )

    return Response({'success': True, 'message': 'Your application has been received. We will contact you shortly.'})
