import type { Root } from 'parchment'
import type { BlockEmbed as TypeBlockEmbed } from 'quill/blots/block'
import type FluentEditor from '../../../core/fluent-editor'
import LogicFlow from '@logicflow/core'
import { DndPanel, SelectionSelect } from '@logicflow/extension'
import Quill from 'quill'
import { initContextMenu } from '../modules/context-menu'
import { createControlPanel } from '../modules/control-panel'
import { FlowChartResizeAction } from '../modules/custom-resize-action'
import '../style/flow-chart.scss'

const BlockEmbed = Quill.import('blots/embed') as typeof TypeBlockEmbed

class FlowChartPlaceholderBlot extends BlockEmbed {
  static blotName = 'flow-chart-placeholder'
  static tagName = 'div'
  static className = 'ql-flow-chart'
  flowChart: LogicFlow | null = null
  data: any
  contextMenu: HTMLElement | null = null
  currentElement: any = null
  width: number = 100
  height: number = 500
  parentObserver: MutationObserver | null = null

  constructor(scroll: Root, domNode: HTMLElement) {
    super(scroll, domNode)
    const data = FlowChartPlaceholderBlot.value(domNode)
    this.width = data.width || 100
    this.height = data.height || 500
    this.domNode.style.width = `${this.width}${data.width ? 'px' : '%'}`
    this.domNode.style.height = `${this.height}px`
    this.domNode.style.maxWidth = '100%'
    this.domNode.style.border = '1px solid #e8e8e8'

    this.data = FlowChartPlaceholderBlot.value(this.domNode)
    this.initFlowChart()
  }

  static value(domNode: HTMLElement): any {
    const dataStr = JSON.parse(domNode.getAttribute('data-flow-chart'))
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
      node.setAttribute('data-flow-chart', JSON.stringify(value))
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

  initFlowChart(): void {
    if (this.domNode.isConnected) {
      this.insertFlowChartEditor()
    }
    else {
      const observer = new MutationObserver(() => {
        if (this.domNode.isConnected) {
          this.insertFlowChartEditor()
          observer.disconnect()
        }
      })
      observer.observe(document.body, { childList: true, subtree: true })
    }
  }

  insertFlowChartEditor(): void {
    this.domNode.style.width = `${this.width}${this.data.width ? 'px' : '%'}`
    this.domNode.style.height = `${this.height}px`
    this.updateAlignmentStyle()
    this.observeParentAlignment()
    this.flowChart = new LogicFlow({
      container: this.domNode,
      stopScrollGraph: true,
      stopZoomGraph: true,
      allowResize: true,
      allowRotate: true,
      editable: true,
      preventDefaultDoubleClick: true,
      preventDefault: true,
      grid: {
        type: 'dot',
        size: 20,
      },
      plugins: [DndPanel, SelectionSelect],
    })
    new FlowChartResizeAction(this)
    const quill = this.scroll as unknown as FluentEditor
    createControlPanel(this, quill) // 创建控制面板
    initContextMenu(this, quill) // 初始化右键菜单
    this.observeOwnParentChange()
    this.flowChart.render(this.data)
    this.flowChart.on('graph:updated', () => {
      this.data = this.flowChart.getGraphData()
      this.domNode.setAttribute('data-flow-chart', JSON.stringify(this.data))
      this.scroll.update([], {})
    })
    this.flowChart.on('history:change', () => {
      this.data = this.flowChart.getGraphData()
      this.domNode.setAttribute('data-flow-chart', JSON.stringify(this.data))
      this.scroll.update([], {})
    })
    this.flowChart.on('node:dbclick', this.handleNodeDblClick.bind(this))
    this.flowChart.on('edge:dbclick', this.handleNodeDblClick.bind(this))
  }

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

  observeParentAlignment(): void {
    // 移除旧的监听器
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

    // 保存新的监听器引用
    this.parentObserver = observer

    const parent = this.domNode.parentElement
    if (parent) {
      observer.observe(parent, {
        attributes: true,
        attributeFilter: ['class'],
      })
      // 强制更新一次对齐样式
      this.updateAlignmentStyle()
    }
  }

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

  // 处理节点双击事件
  handleNodeDblClick(event: any) {
    const { data, position, e } = event
    if (data && data.id) {
      this.createEditInput(data, position, e)
    }
  }

  // 创建编辑输入框
  createEditInput(nodeData: any, position: any, e: any) {
    const input = document.createElement('textarea')
    input.className = 'ql-flow-chart-edit-input'
    input.value = nodeData.text?.value || ''
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
      whiteSpace: 'pre',
      textAlign: 'center',
      background: '#fff',
      border: '1px solid #edefed',
      borderRadius: '3px',
      outline: 'none',
      transform: 'translate(-50%, -50%)',
      resize: 'none',
      zIndex: '1000',
      left: `${e.pageX}px`,
      top: `${e.pageY}px`,
      overflow: 'hidden',
    })
    document.body.appendChild(input)
    autoResize()
    input.addEventListener('input', autoResize)
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        this.flowChart.updateText(nodeData.id, input.value)
        autoResize()
      }
    })
    input.focus()

    this.flowChart.on('blank:mousedown', () => {
      this.flowChart.updateText(nodeData.id, input.value)
      input.remove()
    })

    this.flowChart.on('node:click', () => {
      this.flowChart.updateText(nodeData.id, input.value)
      input.remove()
    })

    this.flowChart.on('edge:click', () => {
      this.flowChart.updateText(nodeData.id, input.value)
      input.remove()
    })
  }

  updateText(nodeId: string, text: string) {
    this.flowChart.updateNode(nodeId, {
      text: { value: text },
    })
  }

  destroyFlowChart() {
    if (this.flowChart) {
      this.flowChart.destroy()
      this.flowChart = null
    }
    const editInputs = document.querySelectorAll('.ql-flow-chart-edit-input')
    editInputs.forEach(input => input.remove())
  }

  remove() {
    this.destroyFlowChart()
    super.remove()
  }
}

Quill.register(FlowChartPlaceholderBlot)

export default FlowChartPlaceholderBlot
