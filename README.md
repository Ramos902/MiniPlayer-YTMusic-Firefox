# Mini Player - YouTube Music Controller

Extensão responsiva para o Mozilla Firefox que replica com precisão o mini player do YouTube Music exibido na barra de ferramentas ou em janela flutuante independente.

---

## 🎨 Design e Recursos

* **Visual Baseado no Tema do Navegador:**
  * Paleta vinho escuro / bordeaux (`#2b080f` a `#190407`).
  * Destaques em vermelho rubi (`#ef4444` / `#f43f5e`).
  * Bordas suaves com cantos arredondados (`16px`) e sombras refinadas.
* **Metadados e Capa em Tempo Real:**
  * Exibe capa do álbum, título da música, artista e contagem de tempo (`0:39 / 2:48`).
* **Barra de Progresso (Scrubber):**
  * Linha de progresso vermelha totalmente clicável para avançar ou retroceder para qualquer ponto da música.
* **Ações Rápidas de Faixa:**
  * Botão de Não Gostei (`👎`).
  * Botão de Gostei (`👍`) com destaque em formato de pílula vermelha ativa quando curtido.
  * Botões de Ordem Aleatória (`🔀`) e Repetição (`🔁`).
* **Controles Principais:**
  * Faixa Anterior (`|◀`) e Próxima Faixa (`▶|`).
  * Voltar 10 segundos (`↺ 10`) e Avançar 10 segundos (`↻ 10`).
  * Botão central circular de Play / Pause (`▶` / `❚❚`).
* **Ajustes Rápidos na Barra Inferior:**
  * Controle de volume com slider vermelho e atalho para silenciar (`🔊` / `🔇`).
  * Dropdown de velocidade de reprodução (`0.5x`, `1x`, `1.25x`, `1.5x`, `2x`).
  * Temporizador de desligamento / Sleep Timer (`⏱ None`, `15 min`, `30 min`, `45 min`, `1 hora`).
* **Acordeão de Letra (Lyrics):**
  * Seção recolhível no rodapé para visualizar a letra da música.
* **Ações do Cabeçalho:**
  * `🗗` Destacar em mini-janela flutuante independente.
  * `↗` Ir direto para a aba do YouTube Music.
  * `⚙` Sincronizar / recarregar estado.

---

## 🚀 Como Instalar e Testar no Firefox

1. Abra o **Mozilla Firefox** e acesse:
   ```text
   about:debugging#/runtime/this-firefox
   ```
2. Na seção de extensões temporárias, localize a extensão e clique em **"Recarregar"** (*Reload*)  
   *(Ou clique em "Carregar extensão temporária..." e selecione o arquivo `manifest.json`)*.
3. Certifique-se de que o **YouTube Music** (`music.youtube.com`) está aberto em uma das suas abas e dê `F5` nele para carregar o controlador.
4. Clique no ícone do **Mini Player** na barra de ferramentas do Firefox.

