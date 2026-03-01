Clube do Auto - v5 (Admin dentro do app)

✅ O histórico agora NÃO depende de editar o código.
✅ Admin gerencia permissões dentro do app (aba Admin).

Arquivos para substituir na raiz do repositório:
- index.html
- manifest.webmanifest
- sw.js

Mantenha na raiz:
- logo.png
- icon-192.png
- icon-512.png

IMPORTANTE: Atualize as REGRAS do Firestore (Build > Firestore Database > Rules):

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isSignedIn() { return request.auth != null; }
    function email() { return request.auth.token.email; }
    function isHardAdmin() {
      return isSignedIn() &&
      (email() == 'admin@clubedoauto.com' || email() == 'frank.since96@gmail.com');
    }

    match /vistorias/{docId} {
      allow read, write: if isSignedIn();
    }

    match /user_roles/{docId} {
      // qualquer autenticado pode ler para o app saber o perfil
      allow read: if isSignedIn();
      // apenas hard admins podem escrever (gerenciar permissões)
      allow write: if isHardAdmin();
    }
  }
}

Depois de publicar, entre com admin@clubedoauto.com ou frank.since96@gmail.com
e use a aba "Admin" para dar acesso (closer/gerente/admin) aos demais.
