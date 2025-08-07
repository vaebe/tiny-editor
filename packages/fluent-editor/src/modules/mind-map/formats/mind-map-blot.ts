import type { Root } from 'parchment'
import type { BlockEmbed as TypeBlockEmbed } from 'quill/blots/block'
import type FluentEditor from '../../../core/fluent-editor'
import Quill from 'quill'
import SimpleMindMap from 'simple-mind-map'
import Drag from 'simple-mind-map/src/plugins/Drag.js'
import Export from 'simple-mind-map/src/plugins/Export.js'
import { initContextMenu } from '../modules/context-menu'
import { createControlPanel } from '../modules/control-panel'
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

  constructor(scroll: Root, domNode: HTMLElement) {
    super(scroll, domNode)
    this.domNode.classList.add('ql-mind-map-container')
    this.domNode.style.height = '500px'
    this.domNode.style.border = '1px solid #e8e8e8'
    this.data = MindMapPlaceholderBlot.value(this.domNode)
    this.initMindMap()
  }

  static value(domNode: HTMLElement): any {
    const dataStr = JSON.parse(domNode.getAttribute('data-mind-map'))
    return dataStr.root ? dataStr.root : dataStr
  }

  static create(value: any): HTMLElement {
    const node = super.create() as HTMLElement
    if (value) {
      node.setAttribute('data-mind-map', JSON.stringify(value))
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
    this.domNode.style.width = '100%'
    this.domNode.style.height = '500px'
    while (this.domNode.firstChild) {
      this.domNode.removeChild(this.domNode.firstChild)
    }
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
    const quill = this.scroll as unknown as FluentEditor
    createControlPanel(this, quill) // 创建控制面板
    initContextMenu(this, quill) // 初始化右键菜单
    this.mindMap.on('node_tree_render_end', () => {
      this.data = this.mindMap.getData({})
      this.domNode.setAttribute('data-mind-map', JSON.stringify(this.data))
      this.scroll.update([], {})
    })
    if (this.mindMap) {
      this.mindMap.setData(this.data)
    }
  }

  value(): any {
    return this.data
  }
}

Quill.register(MindMapPlaceholderBlot)

export default MindMapPlaceholderBlot
