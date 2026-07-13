"""Quality & Safety services — deadline monitoring and dashboard aggregation."""
from datetime import timedelta
from django.utils import timezone


class DeadlineMonitorService:
    """Centralized deadline monitoring for quality and safety workflows."""

    @staticmethod
    def get_upcoming_deadlines(days_ahead=30):
        """Returns all upcoming deadlines: medical certs, instructor quals,
        aircraft certs, document revisions, audit schedules, CAPA due dates,
        contract expirations.

        Returns a sorted list of dicts with keys:
            type, item_name, expiry_date, days_remaining, responsible
        """
        from apps.students.models import MedicalCertificate, GroundInstructor, FlightInstructor
        from apps.flight_training.models import Aircraft
        from apps.administration.models import Contract
        from .models import QualityDocument, Audit, CAPA

        now = timezone.now()
        today = now.date()
        items = []

        # ── Student medical certificates ──────────────────────────────────────
        expiry_upper = today + timedelta(days=days_ahead)
        for mc in MedicalCertificate.objects.filter(
            expiry_date__lte=expiry_upper,
            expiry_date__gte=today,
            status='valid',
        ).select_related('student__user'):
            items.append({
                'type': 'medical_certificate',
                'item_name': f"Medical: {mc.student.full_name}",
                'expiry_date': mc.expiry_date.isoformat(),
                'days_remaining': (mc.expiry_date - today).days,
                'responsible': mc.student.user.email if mc.student.user else None,
            })

        # ── Ground instructor medicals ────────────────────────────────────────
        for gi in GroundInstructor.objects.filter(
            medical_expiry__lte=expiry_upper,
            medical_expiry__gte=today,
        ).select_related('user'):
            items.append({
                'type': 'instructor_medical',
                'item_name': f"Ground Instructor Medical: {gi.first_name} {gi.last_name}",
                'expiry_date': gi.medical_expiry.isoformat(),
                'days_remaining': (gi.medical_expiry - today).days,
                'responsible': gi.user.email,
            })

        # ── Flight instructor medicals & licenses ─────────────────────────────
        for fi in FlightInstructor.objects.filter(
            medical_expiry__lte=expiry_upper,
            medical_expiry__gte=today,
        ).select_related('user'):
            items.append({
                'type': 'instructor_medical',
                'item_name': f"Flight Instructor Medical: {fi.first_name} {fi.last_name}",
                'expiry_date': fi.medical_expiry.isoformat(),
                'days_remaining': (fi.medical_expiry - today).days,
                'responsible': fi.user.email,
            })

        for fi in FlightInstructor.objects.filter(
            license_expiry__lte=expiry_upper,
            license_expiry__gte=today,
        ).select_related('user'):
            items.append({
                'type': 'instructor_license',
                'item_name': f"Flight Instructor License: {fi.first_name} {fi.last_name}",
                'expiry_date': fi.license_expiry.isoformat(),
                'days_remaining': (fi.license_expiry - today).days,
                'responsible': fi.user.email,
            })

        # ── Aircraft certification & insurance ────────────────────────────────
        for ac in Aircraft.objects.filter(
            certification_expiry__lte=expiry_upper,
            certification_expiry__gte=today,
        ):
            items.append({
                'type': 'aircraft_certification',
                'item_name': f"Aircraft Cert: {ac.registration}",
                'expiry_date': ac.certification_expiry.isoformat(),
                'days_remaining': (ac.certification_expiry - today).days,
                'responsible': None,
            })

        for ac in Aircraft.objects.filter(
            insurance_expiry__lte=expiry_upper,
            insurance_expiry__gte=today,
        ):
            items.append({
                'type': 'aircraft_insurance',
                'item_name': f"Aircraft Insurance: {ac.registration}",
                'expiry_date': ac.insurance_expiry.isoformat(),
                'days_remaining': (ac.insurance_expiry - today).days,
                'responsible': None,
            })

        for ac in Aircraft.objects.filter(
            next_maintenance__date__lte=expiry_upper,
            next_maintenance__date__gte=today,
        ):
            items.append({
                'type': 'aircraft_maintenance',
                'item_name': f"Aircraft Mx: {ac.registration}",
                'expiry_date': ac.next_maintenance.date().isoformat(),
                'days_remaining': (ac.next_maintenance.date() - today).days,
                'responsible': None,
            })

        # ── Quality document revisions ────────────────────────────────────────
        for qd in QualityDocument.objects.filter(
            revision_date__lte=expiry_upper,
            revision_date__gte=today,
        ).select_related('author'):
            items.append({
                'type': 'document_revision',
                'item_name': f"Doc Revision: {qd.number} - {qd.title}",
                'expiry_date': qd.revision_date.isoformat(),
                'days_remaining': (qd.revision_date - today).days,
                'responsible': qd.author.email if qd.author else None,
            })

        # ── Upcoming audits ───────────────────────────────────────────────────
        for audit in Audit.objects.filter(
            scheduled_date__lte=now + timedelta(days=days_ahead),
            scheduled_date__gte=now,
        ).select_related('lead_auditor'):
            items.append({
                'type': 'audit',
                'item_name': f"Audit: {audit.title}",
                'expiry_date': audit.scheduled_date.isoformat(),
                'days_remaining': (audit.scheduled_date - now).days,
                'responsible': audit.lead_auditor.email if audit.lead_auditor else None,
            })

        # ── CAPA due dates ────────────────────────────────────────────────────
        for capa in CAPA.objects.filter(
            due_date__lte=now + timedelta(days=days_ahead),
            status__in=['open', 'in_progress'],
        ).select_related('responsible'):
            days = (capa.due_date - now).days
            items.append({
                'type': 'capa_due',
                'item_name': f"CAPA: {capa.title}",
                'expiry_date': capa.due_date.isoformat(),
                'days_remaining': days,
                'responsible': capa.responsible.email if capa.responsible else None,
            })

        # ── Contract expirations ──────────────────────────────────────────────
        for contract in Contract.objects.filter(
            end_date__lte=expiry_upper,
            end_date__gte=today,
            status='active',
        ).select_related('student__user'):
            items.append({
                'type': 'contract_expiration',
                'item_name': f"Contract: {contract.contract_number}",
                'expiry_date': contract.end_date.isoformat(),
                'days_remaining': (contract.end_date - today).days,
                'responsible': contract.student.user.email if contract.student.user else None,
            })

        items.sort(key=lambda x: x['days_remaining'])
        return items
