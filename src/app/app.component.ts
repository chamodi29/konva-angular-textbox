import { Component, AfterViewInit } from '@angular/core';
import Konva from 'konva';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements AfterViewInit {
  title: string = 'My App';
  private stage: Konva.Stage | null = null;
  textBoxMode: boolean = false;

  ngAfterViewInit(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.stage = new Konva.Stage({
      container: 'container',
      width: width,
      height: height,
    });

    const layer = new Konva.Layer();
    this.stage.add(layer);

    this.stage.on('click', () => {
      this.addTextbox()
    })

    const textNode = new Konva.Text({
      text: 'Text ...',
      x: 15,
      y: 100,
      fontSize: 20,
      fill: '#FF0000',
      padding: 7,
      draggable: true,
      width: 160,
    });

    const rect = new Konva.Rect({
      x: 15,
      y: 100,
      width: textNode.width(),
      height: textNode.height(),
      fill: '#FFF753',
      draggable: true,
      opacity: 0.5,
    });

    layer.add(rect);
    layer.add(textNode);

    const tr = new Konva.Transformer({
      nodes: [textNode, rect],
      keepRatio: false,
      rotateEnabled: false,
      borderStroke: '#7E7A76',
      anchorSize: 8,
      anchorStroke: '#605D5A',
      anchorCornerRadius: 50,
      enabledAnchors: ['middle-left', 'middle-right'],
      // set minimum width of text
      boundBoxFunc: function (oldBox, newBox) {
        newBox.width = Math.max(30, newBox.width);
        return newBox;
      },
    });

    rect.on('transform', function () {
      // reset scale, so only width is changing by transformer
      textNode.setAttrs({
        width: textNode.width() * textNode.scaleX(),
        scaleX: 1,
      });
      rect.setAttrs({
        width: textNode.width(),
        height: textNode.height(),
        scaleX: 1,
      });
    });

    layer.add(tr);

    textNode.on('dblclick dbltap', () => {
      // hide text node and transformer:
      textNode.hide();
      tr.show();

      // create textarea over canvas with absolute position
      // first we need to find position for textarea
      // how to find it?

      // at first let's find the position of the text node relative to the stage:
      // Declare the textPosition variable
      let textPosition: Konva.Vector2d;
      textPosition = textNode.absolutePosition();
      const container = this.stage?.container();
      let areaPosition: { x: number, y: number } = { x: 0, y: 0 }; // Default value

      if (container) {
        areaPosition = {
          x: container.offsetLeft + textPosition.x,
          y: container.offsetTop + textPosition.y,
        };
      }

      // create textarea and style it
      const textarea = document.createElement('textarea');
      document.body.appendChild(textarea);

      // apply many styles to match the text on canvas as closely as possible
      // remember that text rendering on canvas and on the textarea can be different
      // and sometimes it is hard to make them 100% the same, but we will try...
      textarea.value = textNode.text();
      textarea.style.position = 'absolute';
      textarea.style.top = areaPosition.y + 'px';
      textarea.style.left = areaPosition.x + 'px';
      textarea.style.width = textNode.width() - textNode.padding() * 2 + 'px';
      textarea.style.height = textNode.height() - textNode.padding() * 2 + 'px';
      textarea.style.fontSize = textNode.fontSize() + 'px';
      textarea.style.border = 'none';
      textarea.style.padding = '7px';
      textarea.style.margin = '0px';
      textarea.style.overflow = 'hidden';
      textarea.style.background = 'none';
      textarea.style.outline = 'none';
      textarea.style.resize = 'none';
      textarea.style.lineHeight = textNode.lineHeight().toString();
      textarea.style.fontFamily = textNode.fontFamily();
      textarea.style.transformOrigin = 'left top';
      textarea.style.textAlign = textNode.align();
      textarea.style.color = textNode.fill();
      let rotation = textNode.rotation();
      let transform = '';
      if (rotation) {
        transform += 'rotateZ(' + rotation + 'deg)';
      }

      let px = 0;
      // also, we need to slightly move the textarea on Firefox
      // because it jumps a bit
      const isFirefox = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
      if (isFirefox) {
        px += 2 + Math.round(textNode.fontSize() / 20);
      }
      transform += 'translateY(-' + px + 'px)';

      textarea.style.transform = transform;

      // reset height
      textarea.style.height = 'auto';
      // after the browser resizes it, we can set the actual value
      textarea.style.height = textarea.scrollHeight + 3 + 'px';

      textarea.focus();

      function removeTextarea() {
        if (textarea.parentNode) {
          textarea.parentNode.removeChild(textarea);
          window.removeEventListener('click', handleOutsideClick);
          textNode.show();
          tr.show();
          tr.forceUpdate();
        }
      }

      function setTextareaWidth(newWidth: number) {
        if (!newWidth) {
          // set width for placeholder
          newWidth = textNode.text().length * textNode.fontSize();
        }
        // some extra fixes on different browsers
        const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
        const isFirefox = navigator.userAgent.toLowerCase().indexOf('firefox') > -1;
        if (isSafari || isFirefox) {
          newWidth = Math.ceil(newWidth);
        }

        const isEdge = document.DOCUMENT_NODE || /Edge/.test(navigator.userAgent);
        if (isEdge) {
          newWidth += 1;
        }
        textarea.style.width = newWidth + 'px';
      }

      textarea.addEventListener('keydown', function (e) {
        // hide on enter
        // but don't hide on shift + enter
        if (e.keyCode === 13 && !e.shiftKey) {
          textNode.text(textarea.value);
          removeTextarea();
          tr.hide();
        }
        // on esc do not set value back to node
        if (e.keyCode === 27) {
          removeTextarea();
          tr.hide();
        }
      });

      textarea.addEventListener('keydown', function (e) {
        const scale = textNode.getAbsoluteScale().x;
        setTextareaWidth(textNode.width() * scale);
        textNode.text(textarea.value);
        textarea.style.height = 'auto';
        textarea.style.height = textarea.scrollHeight + textNode.fontSize() + 'px';

        rect.setAttrs({
          width: textNode.width() + textNode.padding() * 2 + 2,
          height: textNode.height() + textNode.padding() * 2 - 14
        });
      });

      function handleOutsideClick(e: MouseEvent) {
        if (e.target !== textarea) {
          textNode.text(textarea.value);
          removeTextarea();
          tr.hide();
          layer.batchDraw(); // Force redraw to update the stage
        }
      }

      setTimeout(() => {
        window.addEventListener('click', handleOutsideClick);
      });
    })

    // // Create the button element
    // const addButton = document.createElement('button');
    // addButton.textContent = 'Add Textbox';
    // document.body.appendChild(addButton);

    // // Add an event listener to handle the button click
    // addButton.addEventListener('click', () => {
    //   this.addTextbox();
    // });

    //this.addTextbox();

  }

  toggleTextBoxMode(): void {
    this.textBoxMode = !this.textBoxMode
  }

  addTextbox(): void {
    if (this.stage && this.textBoxMode) {

      // this.stage.on('click', () => {
      const layer = new Konva.Layer();
      this.stage?.add(layer);

      const pos = this.stage?.getRelativePointerPosition() ?? { x: 0, y: 0 };

      const textNode = new Konva.Text({
        text: 'New Textbox',
        x: pos.x,
        y: pos.y,
        fontSize: 20,
        fill: '#FF0000',
        padding: 7,
        draggable: true,
        width: 160,
      });

      const rect = new Konva.Rect({
        x: textNode.x(),
        y: textNode.y(),
        width: textNode.width(),
        height: textNode.height(),
        fill: '#FFF753',
        draggable: true,
        opacity: 0.5,
      });

      const tr = new Konva.Transformer({
        nodes: [textNode, rect],
        keepRatio: false,
        rotateEnabled: false,
        borderStroke: '#7E7A76',
        anchorSize: 8,
        anchorStroke: '#605D5A',
        anchorCornerRadius: 50,
        enabledAnchors: ['middle-left', 'middle-right'],
        boundBoxFunc: function (oldBox, newBox) {
          newBox.width = Math.max(30, newBox.width);
          return newBox;
        },
      });

      rect.on('transform', function () {
        // reset scale, so only width is changing by transformer
        textNode.setAttrs({
          width: textNode.width() * textNode.scaleX(),
          scaleX: 1,
        });
        rect.setAttrs({
          width: textNode.width(),
          height: textNode.height(),
          scaleX: 1,
        });
      });

      textNode.on('dblclick dbltap', () => {
        // hide text node and transformer:
        textNode.hide();
        tr.show();

        // create textarea over canvas with absolute position
        // first we need to find position for textarea
        // how to find it?

        // at first let's find the position of the text node relative to the stage:
        // Declare the textPosition variable
        let textPosition: Konva.Vector2d;
        textPosition = textNode.absolutePosition();
        const container = this.stage?.container();
        let areaPosition: { x: number, y: number } = { x: 0, y: 0 }; // Default value

        if (container) {
          areaPosition = {
            x: container.offsetLeft + textPosition.x,
            y: container.offsetTop + textPosition.y,
          };
        }

        // create textarea and style it
        const textarea = document.createElement('textarea');
        document.body.appendChild(textarea);

        // apply many styles to match the text on canvas as closely as possible
        // remember that text rendering on canvas and on the textarea can be different
        // and sometimes it is hard to make them 100% the same, but we will try...
        textarea.value = textNode.text();
        textarea.style.position = 'absolute';
        textarea.style.top = areaPosition.y + 'px';
        textarea.style.left = areaPosition.x + 'px';
        textarea.style.width = textNode.width() - textNode.padding() * 2 + 'px';
        textarea.style.height = textNode.height() - textNode.padding() * 2 + 'px';
        textarea.style.fontSize = textNode.fontSize() + 'px';
        textarea.style.border = 'none';
        textarea.style.padding = '7px';
        textarea.style.margin = '0px';
        textarea.style.overflow = 'hidden';
        textarea.style.background = 'none';
        textarea.style.outline = 'none';
        textarea.style.resize = 'none';
        textarea.style.lineHeight = textNode.lineHeight().toString();
        textarea.style.fontFamily = textNode.fontFamily();
        textarea.style.transformOrigin = 'left top';
        textarea.style.textAlign = textNode.align();
        textarea.style.color = textNode.fill();
        let rotation = textNode.rotation();
        let transform = '';
        if (rotation) {
          transform += 'rotateZ(' + rotation + 'deg)';
        }

        let px = 0;
        // also, we need to slightly move the textarea on Firefox
        // because it jumps a bit
        const isFirefox = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
        if (isFirefox) {
          px += 2 + Math.round(textNode.fontSize() / 20);
        }
        transform += 'translateY(-' + px + 'px)';

        textarea.style.transform = transform;

        // reset height
        textarea.style.height = 'auto';
        // after the browser resizes it, we can set the actual value
        textarea.style.height = textarea.scrollHeight + 3 + 'px';

        textarea.focus();

        function removeTextarea() {
          if (textarea.parentNode) {
            textarea.parentNode.removeChild(textarea);
            window.removeEventListener('click', handleOutsideClick);
            textNode.show();
            tr.show();
            tr.forceUpdate();
          }
        }

        function setTextareaWidth(newWidth: number) {
          if (!newWidth) {
            // set width for placeholder
            newWidth = textNode.text().length * textNode.fontSize();
          }
          // some extra fixes on different browsers
          const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
          const isFirefox = navigator.userAgent.toLowerCase().indexOf('firefox') > -1;
          if (isSafari || isFirefox) {
            newWidth = Math.ceil(newWidth);
          }

          const isEdge = document.DOCUMENT_NODE || /Edge/.test(navigator.userAgent);
          if (isEdge) {
            newWidth += 1;
          }
          textarea.style.width = newWidth + 'px';
        }

        textarea.addEventListener('keydown', function (e) {
          // hide on enter
          // but don't hide on shift + enter
          if (e.keyCode === 13 && !e.shiftKey) {
            textNode.text(textarea.value);
            removeTextarea();
            tr.hide();
          }
          // on esc do not set value back to node
          if (e.keyCode === 27) {
            removeTextarea();
            tr.hide();
          }
        });

        textarea.addEventListener('keydown', function (e) {
          const scale = textNode.getAbsoluteScale().x;
          setTextareaWidth(textNode.width() * scale);
          textNode.text(textarea.value);
          textarea.style.height = 'auto';
          textarea.style.height = textarea.scrollHeight + textNode.fontSize() + 'px';

          rect.setAttrs({
            width: textNode.width() + textNode.padding() * 2 + 2,
            height: textNode.height() + textNode.padding() * 2 - 14
          });
        });

        function handleOutsideClick(e: MouseEvent) {
          if (e.target !== textarea) {
            textNode.text(textarea.value);
            removeTextarea();
            tr.hide();
            layer.batchDraw(); // Force redraw to update the stage
          }
        }

        setTimeout(() => {
          window.addEventListener('click', handleOutsideClick);
        });
      })

      layer.add(rect);
      layer.add(textNode);
      layer.add(tr);
      layer.batchDraw();

      this.textBoxMode = false;
      // })

    }
  }

}
