# Simplex Passo a Passo (ensino)

Aplicação web 100% estática para estudar o Método Simplex passo a passo.

## Recursos

- Montagem do tableau inicial a partir da função objetivo e das restrições.
- Avanço manual, uma iteração por clique.
- Destaque da coluna pivô, linha pivô e célula pivô.
- Resultado final com `x1`, `x2`, ..., `xn` e valor ótimo `Z`.
- Download em Excel (`.xls`) com o histórico das iterações até a solução ótima.

## Como usar localmente

Abra `index.html` diretamente no navegador. Não há backend, Python, Gradio, pandas nem dependências externas obrigatórias.

Para testar via localhost:

```powershell
python -m http.server 8000
```

Depois acesse `http://localhost:8000`.

## Publicar no GitHub Pages

1. Crie um repositório no GitHub.
2. Envie `index.html`, `style.css`, `script.js` e este `README.md`.
3. Acesse `Settings > Pages`.
4. Em `Build and deployment`, selecione a branch `main` e a pasta `/root`.
5. Salve e acesse a URL gerada pelo GitHub Pages.
