#!/bin/bash
cd /opt/masterly-air-academy

# Read credentials from environment or prompt
DIRECTOR_PASS="${DIRECTOR_PASS:-director123}"
FINANCE_PASS="${FINANCE_PASS:-finance123}"
QUALITY_PASS="${QUALITY_PASS:-quality123}"
SCHEDULER_PASS="${SCHEDULER_PASS:-scheduler123}"

echo "=== Seeding database ==="
docker-compose exec -T api python manage.py seed_demo_data

echo "=== Creating special accounts ==="
docker-compose exec -T api python manage.py shell -c "
from django.contrib.auth import get_user_model; from django.contrib.auth.models import Group
User = get_user_model()
for e,p,r,f,l in [('director@masterly-air-academy.dz','$DIRECTOR_PASS','director_general','Director','General'),('finance@masterly-air-academy.dz','$FINANCE_PASS','finance_responsible','Finance','Manager'),('quality@masterly-air-academy.dz','$QUALITY_PASS','quality_manager','Quality','Manager'),('scheduler@masterly-air-academy.dz','$SCHEDULER_PASS','scheduler','Scheduler','User')]:
    u,_=User.objects.get_or_create(email=e,defaults={'username':r,'role':r,'status':'active','is_active':True,'first_name':f,'last_name':l})
    u.set_password(p);u.save()
    g=Group.objects.filter(name=r).first()
    if g:u.groups.add(g)
    print(f'{e} created')
"

echo "=== Verifying ==="
curl -s -o /dev/null -w "%{http_code}" http://localhost:7788/
echo " <- landing page"
curl -s -o /dev/null -w "%{http_code}" http://localhost:7788/admin/login/
echo " <- admin login"
echo "=== Deployment complete ==="
