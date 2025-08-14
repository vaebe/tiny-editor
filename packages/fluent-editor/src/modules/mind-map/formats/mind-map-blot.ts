import type { Root } from 'parchment'
import type { BlockEmbed as TypeBlockEmbed } from 'quill/blots/block'
import type FluentEditor from '../../../core/fluent-editor'
import Quill from 'quill'
import SimpleMindMap from 'simple-mind-map'
import Drag from 'simple-mind-map/src/plugins/Drag.js'
import Export from 'simple-mind-map/src/plugins/Export.js'
import { initContextMenu } from '../modules/context-menu'
import { createControlPanel } from '../modules/control-panel'
import { MindMapResizeAction } from '../modules/custom-resize-action'
import '../style/mind-map.scss'

const BlockEmbed = Quill.import('blots/embed') as typeof TypeBlockEmbed

class MindMapPlaceholderBlot extends BlockEmbed {
  static blotName = 'mind-map-placeholder'
  static tagName = 'div'
  static className = 'ql-mind-map'
  mindMap: SimpleMindMap | null = null
  data: any
  zoomCount = 0
  contextMenu: HTMLElement | null = null
  currentNode: any = null
  width: number = 100
  height: number = 500
  parentObserver: MutationObserver | null = null

  constructor(scroll: Root, domNode: HTMLElement) {
    super(scroll, domNode)
    const data = MindMapPlaceholderBlot.value(domNode)
    this.width = data.width || 100
    this.height = data.height || 500
    this.domNode.style.width = `${this.width}${data.width ? 'px' : '%'}`
    this.domNode.style.height = `${this.height}px`
    this.domNode.style.maxWidth = '100%'
    this.domNode.style.border = '1px solid #e8e8e8'
    this.data = MindMapPlaceholderBlot.value(this.domNode)
    this.initMindMap()
  }

  static value(domNode: HTMLElement): any {
    const dataStr = JSON.parse(domNode.getAttribute('data-mind-map'))
    const value = dataStr.root ? dataStr.root : dataStr
    if (domNode.hasAttribute('width')) {
      value.width = Number.parseInt(domNode.getAttribute('width'), 10)
    }
    if (domNode.hasAttribute('height')) {
      value.height = Number.parseInt(domNode.getAttribute('height'), 10)
    }

    return dataStr.root ? dataStr.root : dataStr
  }

  static create(value: any): HTMLElement {
    const node = super.create() as HTMLElement
    if (value) {
      node.setAttribute('data-mind-map', JSON.stringify(value))
    }
    if (value.width) {
      node.setAttribute('width', String(value.width))
      node.style.width = `${value.width}%`
    }
    if (value.height) {
      node.setAttribute('height', String(value.height))
      node.style.height = `${value.height}px`
    }
    return node
  }

  initMindMap(): void {
    if (this.domNode.isConnected) {
      this.insertMindMapEditor()
    }
    else {
      const observer = new MutationObserver(() => {
        if (this.domNode.isConnected) {
          this.insertMindMapEditor()
          observer.disconnect()
        }
      })
      observer.observe(document.body, { childList: true, subtree: true })
    }
  }

  insertMindMapEditor(): void {
    this.domNode.style.width = `${this.width}${this.data.width ? 'px' : '%'}`
    this.domNode.style.height = `${this.height}px`
    while (this.domNode.firstChild) {
      this.domNode.removeChild(this.domNode.firstChild)
    }
    this.updateAlignmentStyle()
    this.observeParentAlignment()
    SimpleMindMap.usePlugin(Drag).usePlugin(Export)
    this.mindMap = new SimpleMindMap ({
      el: this.domNode,
      mousewheelAction: 'zoom',
      disableMouseWheelZoom: true,
      data: this.data,
    } as any)

    const handleScroll = () => {
      if (this.mindMap && this.domNode && this.domNode.isConnected) {
        this.mindMap.getElRectInfo()
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })

    this.domNode.addEventListener('remove', () => {
      window.removeEventListener('scroll', handleScroll)
    })
    new MindMapResizeAction(this)
    const quill = this.scroll as unknown as FluentEditor
    createControlPanel(this, quill) // 创建控制面板
    initContextMenu(this, quill) // 初始化右键菜单
    this.observeOwnParentChange()
    this.mindMap.on('node_tree_render_end', () => {
      this.data = this.mindMap.getData({})
      this.domNode.setAttribute('data-mind-map', JSON.stringify(this.data))
      this.scroll.update([], {})
    })
    this.mindMap.on('node_dblclick', this.handleNodeDblClick.bind(this))
    if (this.mindMap) {
      this.mindMap.setData(this.data)
    }
  }

  // 监听父元素变化
  observeOwnParentChange(): void {
    let currentParent = this.domNode.parentElement
    const observer = new MutationObserver(() => {
      if (this.domNode.parentElement !== currentParent) {
        currentParent = this.domNode.parentElement
        this.observeParentAlignment()
      }
    })

    observer.observe(document.body, {
      attributes: false,
      childList: true,
      subtree: true,
    })
  }

  // 监听父元素对齐变化
  observeParentAlignment(): void {
    if (this.parentObserver) {
      this.parentObserver.disconnect()
    }

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          this.updateAlignmentStyle()
        }
      })
    })

    this.parentObserver = observer

    const parent = this.domNode.parentElement
    if (parent) {
      observer.observe(parent, {
        attributes: true,
        attributeFilter: ['class'],
      })
      this.updateAlignmentStyle()
    }
  }

  // 更新对齐样式
  updateAlignmentStyle(): void {
    const parent = this.domNode.parentElement
    if (!parent) return

    this.domNode.style.margin = ''
    this.domNode.style.display = 'block'

    if (parent.classList.contains('ql-align-center')) {
      this.domNode.style.margin = '0 auto'
    }
    else if (parent.classList.contains('ql-align-right')) {
      this.domNode.style.marginLeft = 'auto'
      this.domNode.style.marginRight = '0'
    }
    else {
      this.domNode.style.marginLeft = '0'
      this.domNode.style.marginRight = 'auto'
    }
  }

  handleNodeDblClick(node: any, e: any) {
    if (node && node.uid && e) {
      this.currentNode = node
      this.createEditInput(node, e)
    }
  }

  // 创建编辑输入框
  createEditInput(node: any, e: any) {
    const input = document.createElement('textarea')
    input.className = 'ql-mind-map-edit-input'
    input.value = node.nodeData.data.text || ''
    const autoResize = () => {
      input.style.height = 'auto'
      input.style.height = `${input.scrollHeight}px`
    }
    Object.assign(input.style, {
      position: 'absolute',
      boxSizing: 'border-box',
      width: '100px',
      height: '35px',
      padding: '5px',
      lineHeight: '1.2',
      fontFamily: '微软雅黑',
      fontSize: '16px',
      whiteSpace: 'pre',
      textAlign: 'center',
      background: '#fff',
      border: '1px solid #edefed',
      borderRadius: '3px',
      outline: 'none',
      transform: 'translate(-50%, -50%)',
      resize: 'none',
      zIndex: '1000',
      left: `${e.pageX ? e.pageX : 100}px`,
      top: `${e.pageY ? e.pageY : 100}px`,
      overflow: 'hidden',
    })

    document.body.appendChild(input)
    autoResize()
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && event.shiftKey) {
        autoResize()
      }
    })
    input.focus()

    const currentNode = node
    const handleDrawClick = () => {
      this.updateNodeText(input.value, currentNode)
      input.remove()
      this.mindMap.off('draw_click', handleDrawClick)
    }

    this.mindMap.on('draw_click', handleDrawClick)

    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault()
        this.updateNodeText(input.value, currentNode)
        input.remove()
        this.mindMap.off('draw_click', handleDrawClick)
      }
    })
  }

  updateNodeText(text: string, node: any) {
    if (node && this.mindMap) {
      node.setText(text)
      const editWraps = document.querySelectorAll('.smm-node-edit-wrap')
      editWraps.forEach((editWrap) => {
        const input = editWrap.querySelector('input, textarea')
        if (input) {
          (input as HTMLInputElement | HTMLTextAreaElement).value = text
        }
        else {
          editWrap.textContent = text
        }
      })
      this.data = this.mindMap.getData({})
      this.domNode.setAttribute('data-mind-map', JSON.stringify(this.data))
      this.scroll.update([], {})
    }
  }

  remove() {
    this.mindMap.destroy()
    super.remove()
  }
}

Quill.register(MindMapPlaceholderBlot)

export default MindMapPlaceholderBlot
