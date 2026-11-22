"""Prepara o ambiente local de desenvolvimento (somente dados sintéticos).

    python scripts/dev_setup.py env    # cria Backend/.env com segredos aleatórios
    python scripts/dev_setup.py user   # cria clínica e psicólogo sintéticos no container `api`

Execute a partir de Backend/. Usa apenas a biblioteca padrão.
"""
import base64
import secrets
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ENV, EXAMPLE = ROOT / ".env", ROOT / ".env.example"

USER_CODE = """
from apps.clinics.models import Clinic
from apps.users.models import User, UserRole
c, _ = Clinic.objects.get_or_create(name='Clinica Sintetica', defaults={'document': '00000000000000'})
u, created = User.objects.get_or_create(username='psi', defaults={'email': 'psi@exemplo.test', 'role': UserRole.PSYCHOLOGIST, 'clinic': c})
if created:
    u.set_password(%r)
    u.save()
print('criado' if created else 'ja existia')
"""


def make_env() -> None:
    if ENV.exists():
        sys.exit(f"{ENV} já existe; apague-o antes de gerar outro.")
    generated = {
        "DJANGO_SECRET_KEY": secrets.token_urlsafe(50),
        "CLINICAL_DATA_KEYS": base64.urlsafe_b64encode(secrets.token_bytes(32)).decode(),
        "AUDIT_LOG_HMAC_KEY": secrets.token_urlsafe(48),
        "POSTGRES_PASSWORD": secrets.token_urlsafe(24),
        "AI_SERVICE_TOKEN": secrets.token_urlsafe(48),
    }
    lines = []
    for line in EXAMPLE.read_text(encoding="utf-8").splitlines():
        name = line.partition("=")[0]
        lines.append(f"{name}={generated[name]}" if name in generated else line)
    ENV.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"{ENV} criado com segredos novos. Não o publique.")


def make_user() -> None:
    password = secrets.token_urlsafe(12) + "aA1!"
    subprocess.run(
        ["docker", "compose", "exec", "-T", "api", "python", "manage.py", "shell", "-c", USER_CODE % password],
        cwd=ROOT, check=True,
    )
    print(f"Usuário: psi  |  senha: {password}  (válida só se o usuário foi criado agora)")


if __name__ == "__main__":
    {"env": make_env, "user": make_user}.get(sys.argv[1] if len(sys.argv) > 1 else "", lambda: sys.exit(__doc__))()
