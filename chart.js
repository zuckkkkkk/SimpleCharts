/**
 * Charts Library - Libreria unificata per grafici
 * @version 1.2.2
 *
 * Contiene:
 * - HorizontalGauge: Barre orizzontali con zone colorate e needle + modalità batteria
 * - PieChart: Grafici a torta con etichette esterne intelligenti e anti-sovrapposizione
 *
 *  * Changelog v1.2.2:
 * - Forzato dpr per battery a 4
 * - Diminuito padding per labels in piechart
 *
 * Changelog v1.2.1:
 * - Migliorati connettori PieChart con troppe etichette: opacità variabile e curve bezier
 * - Aumentata dimensione grafico comfort (zones) per compensare bordo bianco più sottile
 *
 * Changelog v1.2.0:
 * - Aggiunto algoritmo anti-sovrapposizione per etichette PieChart
 * - Uniformata altezza tra gauge 'zones' e 'battery' (centramento verticale)
 */

// ============================================================================
// HORIZONTAL GAUGE
// ============================================================================

/**
 * HorizontalGauge - Libreria per creare gauge orizzontali su canvas
 */
class HorizontalGauge {
  /**
   * Crea un nuovo gauge orizzontale
   * @param {HTMLCanvasElement} canvas - L'elemento canvas
   * @param {Object} options - Opzioni di configurazione
   * @param {string} options.style - Stile del gauge: 'zones' (default) o 'battery'
   * @param {Array} options.zones - Array di zone colorate [{start: 0, end: 33, color: '#ff0000'}, ...]
   * @param {number} options.value - Valore corrente del gauge
   * @param {Object} options.needle - Configurazione del needle
   * @param {string} options.needle.color - Colore del needle (default: '#000000')
   * @param {number} options.needle.width - Larghezza del needle (default: 3)
   * @param {Object} options.padding - Padding del gauge
   * @param {number} options.gaugeHeight - Altezza della barra del gauge (default: 40)
   * @param {boolean} options.showValue - Mostra il valore numerico (default: true)
   * @param {boolean} options.showLabels - Mostra le etichette percentuali (default: true)
   * @param {Object} options.battery - Opzioni per lo stile batteria
   */
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    
    this.options = {
      style: options.style || 'zones', // 'zones' o 'battery'
      zones: options.zones || [
        { start: 0, end: 33, color: '#ff4444' },
        { start: 33, end: 66, color: '#ffcc00' },
        { start: 66, end: 100, color: '#44ff44' }
      ],
      value: options.value !== undefined ? options.value : 50,
      needle: {
        color: options.needle?.color || '#000000',
        width: options.needle?.width || 1
      },
      padding: {
        top: options.padding?.top || 20,
        bottom: options.padding?.bottom || 30,
        left: options.padding?.left || 20,
        right: options.padding?.right || 20
      },
      gaugeHeight: options.gaugeHeight || 40,
      showValue: options.showValue !== undefined ? options.showValue : true,
      showLabels: options.showLabels !== undefined ? options.showLabels : true,
      highDPI: options.highDPI !== undefined ? options.highDPI : false,
      battery: {
        terminalWidth: options.battery?.terminalWidth || 8,
        terminalHeight: options.battery?.terminalHeight || 20,
        borderColor: options.battery?.borderColor || '#333333',
        borderWidth: options.battery?.borderWidth || 3,
        backgroundColor: options.battery?.backgroundColor || '#f0f0f0',
        criticalThreshold: options.battery?.criticalThreshold || 25,
        warningThreshold: options.battery?.warningThreshold || 50,
        criticalColor: options.battery?.criticalColor || '#E20613',
        warningColor: options.battery?.warningColor || '#F8B73B',
        goodColor: options.battery?.goodColor || '#678E5B',
        showPercentage: options.battery?.showPercentage !== undefined ? options.battery.showPercentage : true
      }
    };
    
    // Calcola il valore massimo dalle zone
    this.maxValue = this.calculateMaxValue();
    
    // Salva le dimensioni logiche prima di scalare per DPI
    this.logicalWidth = canvas.width;
    this.logicalHeight = canvas.height;
    
    if (this.options.highDPI) {
      this.setupHighDPI();
    }
    this.draw();
  }
  
  calculateMaxValue() {
    if (!this.options.zones || this.options.zones.length === 0) {
      return 100;
    }
    return Math.max(...this.options.zones.map(zone => zone.end));
  }
  
  setupHighDPI() {
    const dpr = 4;
    
    // Scala il canvas mantenendo le dimensioni logiche salvate
    this.canvas.width = this.logicalWidth * dpr;
    this.canvas.height = this.logicalHeight * dpr;
    
    // Scala il contesto
    this.ctx.scale(dpr, dpr);
    
    // Imposta lo stile CSS per mantenere le dimensioni visive
    this.canvas.style.width = this.logicalWidth + 'px';
    this.canvas.style.height = this.logicalHeight + 'px';
    
    this.dpiScale = dpr;
  }
  
  draw() {
    // Usa le dimensioni logiche per il disegno
    const width = this.logicalWidth;
    const height = this.logicalHeight;
    
    this.ctx.clearRect(0, 0, width, height);
    
    if (this.options.style === 'battery') {
      this.drawBattery();
    } else {
      this.drawZonesGauge();
    }
  }
  
  drawZonesGauge() {
    const width = this.logicalWidth;
    const height = this.logicalHeight;
    const gaugeWidth = width - this.options.padding.left - this.options.padding.right;

    // Aumenta l'altezza del gauge per compensare il bordo bianco più sottile (2px vs 3px del battery)
    // Aggiungiamo 6px per compensare visivamente (circa 3px per lato)
    const adjustedGaugeHeight = this.options.gaugeHeight + 6;

    // Centra verticalmente il gauge come nel battery mode
    const gaugeTop = (height - adjustedGaugeHeight) / 2;

    this.drawZones(gaugeWidth, gaugeTop, adjustedGaugeHeight);
    this.drawBorder(gaugeWidth, gaugeTop, adjustedGaugeHeight);

    if (this.options.showLabels) {
      this.drawLabels(gaugeWidth, gaugeTop, adjustedGaugeHeight);
    }

    this.drawNeedle(gaugeWidth, gaugeTop, adjustedGaugeHeight);

    if (this.options.showValue) {
      this.drawValue(gaugeWidth, gaugeTop, adjustedGaugeHeight);
    }
  }
  
  drawBattery() {
    const width = this.logicalWidth;
    const height = this.logicalHeight;
    
    const batteryWidth = width - this.options.padding.left - this.options.padding.right - this.options.battery.terminalWidth;
    const batteryHeight = this.options.gaugeHeight;
    const batteryX = this.options.padding.left;
    const batteryY = (height - batteryHeight) / 2;
    
    // Sfondo della batteria
    this.ctx.fillStyle = this.options.battery.backgroundColor;
    this.ctx.fillRect(batteryX, batteryY, batteryWidth, batteryHeight);
    
    // Riempimento colorato in base al livello
    const percentage = (this.options.value / this.maxValue) * 100;
    const fillWidth = (this.options.value / this.maxValue) * batteryWidth;
    
    let fillColor;
    if (percentage <= this.options.battery.criticalThreshold) {
      fillColor = this.options.battery.criticalColor;
    } else if (percentage <= this.options.battery.warningThreshold) {
      fillColor = this.options.battery.warningColor;
    } else {
      fillColor = this.options.battery.goodColor;
    }
    
    this.ctx.fillStyle = fillColor;
    this.ctx.fillRect(batteryX, batteryY, fillWidth, batteryHeight);
    
    // Bordo principale della batteria
    this.ctx.strokeStyle = this.options.battery.borderColor;
    this.ctx.lineWidth = this.options.battery.borderWidth;
    this.ctx.strokeRect(batteryX, batteryY, batteryWidth, batteryHeight);
    
    // Terminale positivo
    const terminalX = batteryX + batteryWidth;
    const terminalY = batteryY + (batteryHeight - this.options.battery.terminalHeight) / 2;
    
    this.ctx.fillStyle = this.options.battery.borderColor;
    this.ctx.fillRect(
      terminalX,
      terminalY,
      this.options.battery.terminalWidth,
      this.options.battery.terminalHeight
    );
    
    // Percentuale all'interno della batteria
    if (this.options.battery.showPercentage) {
      this.ctx.fillStyle = percentage > 40 ? '#ffffff' : this.options.battery.borderColor;
      this.ctx.font = 'bold 16px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(
        percentage.toFixed(0) + '%',
        batteryX + batteryWidth / 2,
        batteryY + batteryHeight / 2
      );
    }
    
    // Valore sopra la batteria
    if (this.options.showValue) {
      this.ctx.fillStyle = '#333333';
      this.ctx.font = 'bold 14px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'bottom';
      this.ctx.fillText(
        this.options.value.toFixed(1),
        batteryX + batteryWidth / 2,
        batteryY - 5
      );
    }
  }
  
  drawZones(gaugeWidth, gaugeTop, gaugeHeight = null) {
    const height = gaugeHeight || this.options.gaugeHeight;
    const sortedZones = [...this.options.zones].sort((a, b) => a.start - b.start);

    sortedZones.forEach(zone => {
      const startX = this.options.padding.left + (zone.start / this.maxValue) * gaugeWidth;
      const zoneWidth = ((zone.end - zone.start) / this.maxValue) * gaugeWidth;

      this.ctx.fillStyle = zone.color;
      this.ctx.fillRect(startX, gaugeTop, zoneWidth, height);
    });
  }
  
  drawBorder(gaugeWidth, gaugeTop, gaugeHeight = null) {
    const height = gaugeHeight || this.options.gaugeHeight;
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(
      this.options.padding.left,
      gaugeTop,
      gaugeWidth,
      height
    );
  }
  
  drawLabels(gaugeWidth, gaugeTop, gaugeHeight = null) {
    const height = gaugeHeight || this.options.gaugeHeight;
    this.ctx.fillStyle = '#000000';
    this.ctx.font = '12px Arial';
    this.ctx.textAlign = 'center';

    const labels = new Set([0, this.maxValue]);
    this.options.zones.forEach(zone => {
      labels.add(zone.start);
      labels.add(zone.end);
    });

    Array.from(labels).sort((a, b) => a - b).forEach(value => {
      const x = this.options.padding.left + (value / this.maxValue) * gaugeWidth;
      const y = gaugeTop + height + 15;

      this.ctx.fillText(value, x, y);
    });
  }
  
  drawNeedle(gaugeWidth, gaugeTop, gaugeHeight = null) {
    const height = gaugeHeight || this.options.gaugeHeight;
    const value = Math.max(0, Math.min(this.maxValue, this.options.value));
    const needleX = this.options.padding.left + (value / this.maxValue) * gaugeWidth;

    this.ctx.strokeStyle = this.options.needle.color;
    this.ctx.lineWidth = this.options.needle.width;
    this.ctx.beginPath();
    this.ctx.moveTo(needleX, gaugeTop - 2);
    this.ctx.lineTo(needleX, gaugeTop + height + 2);
    this.ctx.stroke();

    this.ctx.fillStyle = this.options.needle.color;

    this.ctx.beginPath();
    this.ctx.moveTo(needleX, gaugeTop + height + 2);
    this.ctx.lineTo(needleX - 4, gaugeTop + height + 8);
    this.ctx.lineTo(needleX + 4, gaugeTop + height + 8);
    this.ctx.closePath();
    this.ctx.fill();
  }
  
  drawValue(gaugeWidth, gaugeTop, gaugeHeight = null) {
    const value = Math.max(0, Math.min(this.maxValue, this.options.value));

    this.ctx.fillStyle = '#333333';
    this.ctx.font = 'bold 16px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(
      value.toFixed(1),
      this.logicalWidth / 2,
      gaugeTop - 10
    );
  }
  
  setValue(newValue) {
    this.options.value = Math.max(0, Math.min(this.maxValue, newValue));
    this.draw();
  }
  
  setZones(zones) {
    this.options.zones = zones;
    this.maxValue = this.calculateMaxValue();
    this.draw();
  }
  
  setNeedleColor(color) {
    this.options.needle.color = color;
    this.draw();
  }
  
  setStyle(style) {
    this.options.style = style;
    this.draw();
  }
  
  redraw() {
    this.draw();
  }
}

// ============================================================================
// PIE CHART
// ============================================================================

/**
 * PieChart - Libreria per creare grafici a torta con etichette esterne
 */
class PieChart {
  /**
   * Crea un nuovo grafico a torta
   * @param {HTMLCanvasElement} canvas - L'elemento canvas
   * @param {Object} options - Opzioni di configurazione
   * @param {Array} options.data - Array di dati [{label: 'Nome', value: 100, color: '#ff0000'}, ...]
   * @param {Object} options.padding - Padding del grafico
   * @param {number} options.labelDistance - Distanza etichette dal bordo (default: 30)
   * @param {number} options.lineLength - Lunghezza linea connettore (default: 20)
   * @param {boolean} options.showPercentages - Mostra percentuali nelle etichette (default: true)
   * @param {boolean} options.showValues - Mostra valori nelle etichette (default: true)
   * @param {Object} options.label - Configurazione etichette
   * @param {Object} options.connector - Configurazione linee connettori
   * @param {string} options.title - Titolo del grafico (opzionale)
   */
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    
    this.options = {
      data: options.data || [],
      padding: {
        top: options.padding?.top || 20,
        bottom: options.padding?.bottom || 20,
        left: options.padding?.left || 20,
        right: options.padding?.right || 20
      },
      labelDistance: options.labelDistance || 30,
      lineLength: options.lineLength || 20,
      showPercentages: options.showPercentages !== undefined ? options.showPercentages : true,
      showValues: options.showValues !== undefined ? options.showValues : true,
      label: {
        font: options.label?.font || '12px Arial',
        color: options.label?.color || '#333333'
      },
      connector: {
        color: options.connector?.color || '#999999',
        width: options.connector?.width || 1
      },
      sliceBorder: {
        color: options.sliceBorder?.color || '#E20613',
        width: options.sliceBorder?.width !== undefined ? options.sliceBorder.width : 1
      },
      title: options.title || null,
      highDPI: options.highDPI !== undefined ? options.highDPI : false
    };
    
    this.slices = [];
    this.centerX = 0;
    this.centerY = 0;
    this.radius = 0;
    this.dpiScale = 1;
    
    // Setup high DPI se richiesto
    if (this.options.highDPI) {
      this.setupHighDPI();
    }
    
    this.calculateLayout();
    this.draw();
  }
  
  /**
   * Configura il canvas per rendering ad alta qualità (high DPI)
   */
  setupHighDPI() {
    const baseDpr = window.devicePixelRatio || 1;
    const qualityMultiplier = 4; // Fattore di qualità
    const dpr = baseDpr * qualityMultiplier;
    
    // Salva le dimensioni CSS originali (CORRETTE)
    const rect = this.canvas.getBoundingClientRect();
    const cssWidth = rect.width;
    const cssHeight = rect.height;
    
    // Scala il canvas con qualità quadruplicata
    this.canvas.width = cssWidth * dpr;
    this.canvas.height = cssHeight * dpr;
    
    // Scala il contesto
    this.ctx.scale(dpr, dpr);
    
    // Imposta lo stile per mantenere le dimensioni CSS
    this.canvas.style.width = cssWidth + 'px';
    this.canvas.style.height = cssHeight + 'px';
    
    this.dpiScale = dpr;
  }
  
  calculateLayout() {
    const totalValue = this.options.data.reduce((sum, item) => sum + item.value, 0);
    if (totalValue === 0) return;
    
    let currentAngle = -Math.PI / 2;
    this.slices = [];
    
    this.options.data.forEach(item => {
      const percentage = (item.value / totalValue) * 100;
      const angleSize = (item.value / totalValue) * 2 * Math.PI;
      const middleAngle = currentAngle + angleSize / 2;
      
      this.slices.push({
        label: item.label,
        value: item.value,
        color: item.color,
        percentage: percentage,
        startAngle: currentAngle,
        endAngle: currentAngle + angleSize,
        middleAngle: middleAngle
      });
      
      currentAngle += angleSize;
    });
    
    this.calculateOptimalRadius();
  }
  
  calculateOptimalRadius() {
    // Usa le dimensioni CSS se highDPI è attivo
    const width = this.options.highDPI ? parseFloat(this.canvas.style.width) : this.canvas.width;
    const height = this.options.highDPI ? parseFloat(this.canvas.style.height) : this.canvas.height;
    
    let titleHeight = 0;
    if (this.options.title) {
      titleHeight = 30;
    }
    
    this.centerX = width / 2;
    this.centerY = (height + titleHeight) / 2;
    
    this.ctx.font = this.options.label.font;
    
    const availableWidth = width - this.options.padding.left - this.options.padding.right;
    const availableHeight = height - this.options.padding.top - this.options.padding.bottom - titleHeight;
    
    // Parti dal massimo possibile
    const maxPossibleRadius = Math.min(availableWidth, availableHeight) / 2.2;
    let testRadius = maxPossibleRadius;
    let step = maxPossibleRadius / 20; // Step iniziale più grande per essere più veloce
    
    // Ricerca binaria per trovare il raggio massimo
    let minRadius = 15;
    let maxRadius = maxPossibleRadius;
    let bestRadius = minRadius;
    
    for (let iteration = 0; iteration < 30; iteration++) {
      testRadius = (minRadius + maxRadius) / 2;
      let allLabelsInside = true;
      const labelDistance = this.options.labelDistance + this.options.lineLength;
      
      for (const slice of this.slices) {
        const labelText = this.formatLabel(slice);
        const labelMeasure = this.measureLabel(labelText);
        
        const lineEndX = this.centerX + Math.cos(slice.middleAngle) * (testRadius + labelDistance);
        const lineEndY = this.centerY + Math.sin(slice.middleAngle) * (testRadius + labelDistance);
        
        let labelLeft, labelRight, labelTop, labelBottom;
        
        if (lineEndX >= this.centerX) {
          // Etichetta a destra
          labelLeft = lineEndX + 5;
          labelRight = labelLeft + labelMeasure.width;
        } else {
          // Etichetta a sinistra
          labelRight = lineEndX - 5;
          labelLeft = labelRight - labelMeasure.width;
        }
        
        labelTop = lineEndY - labelMeasure.height / 2;
        labelBottom = lineEndY + labelMeasure.height / 2;
        
        const minX = this.options.padding.left;
        const maxX = width - this.options.padding.right;
        const minY = this.options.padding.top + titleHeight;
        const maxY = height - this.options.padding.bottom;
        
        // Controllo più stretto
        if (labelLeft < minX || labelRight > maxX || labelTop < minY || labelBottom > maxY) {
          allLabelsInside = false;
          break;
        }
      }
      
      if (allLabelsInside) {
        bestRadius = testRadius;
        minRadius = testRadius; // Prova più grande
      } else {
        maxRadius = testRadius; // Troppo grande, riduci
      }
      
      // Se l'intervallo è molto piccolo, fermati
      if (maxRadius - minRadius < 1) {
        break;
      }
    }
    
    this.radius = Math.max(15, bestRadius - 1); // -1 per margine di sicurezza
  }
  
  formatLabel(slice) {
    let parts = [slice.label];
    
    if (this.options.showValues) {
      parts.push(slice.value.toString());
    }
    
    if (this.options.showPercentages) {
      parts.push(`(${slice.percentage.toFixed(1)}%)`);
    }
    
    return parts.join(' ');
  }
  
  /**
   * Converte colore hex in RGB
   */
  hexToRgb(hex) {
    // Rimuovi il # se presente
    hex = hex.replace(/^#/, '');

    // Gestisci formato breve (#RGB)
    if (hex.length === 3) {
      hex = hex.split('').map(c => c + c).join('');
    }

    const bigint = parseInt(hex, 16);
    return {
      r: (bigint >> 16) & 255,
      g: (bigint >> 8) & 255,
      b: bigint & 255
    };
  }

  /**
   * Divide un'etichetta in linee separate gestendo \n
   */
  splitLabel(labelText) {
    // Gestisce sia \n che \\n
    return labelText.split(/\\n|\n/);
  }
  
  /**
   * Misura le dimensioni di un'etichetta multi-linea
   */
  measureLabel(labelText) {
    const lines = this.splitLabel(labelText);
    const fontSizeMatch = this.options.label.font.match(/(\d+)px/);
    const fontSize = fontSizeMatch ? parseInt(fontSizeMatch[1]) : 12;
    const lineHeight = fontSize + 2;

    let maxWidth = 0;
    lines.forEach(line => {
      const width = this.ctx.measureText(line).width;
      if (width > maxWidth) maxWidth = width;
    });

    return {
      width: maxWidth,
      height: lineHeight * lines.length,
      lines: lines
    };
  }

  /**
   * Calcola le posizioni ottimali delle etichette evitando sovrapposizioni
   */
  calculateLabelPositions() {
    const labelDistance = this.options.labelDistance + this.options.lineLength;
    const positions = [];
    const minSpacing = 1; // Spazio minimo tra etichette

    // Calcola posizioni iniziali
    this.slices.forEach((slice, index) => {
      const labelText = this.formatLabel(slice);
      const labelMeasure = this.measureLabel(labelText);

      const lineEndX = this.centerX + Math.cos(slice.middleAngle) * (this.radius + labelDistance);
      const lineEndY = this.centerY + Math.sin(slice.middleAngle) * (this.radius + labelDistance);

      positions.push({
        index: index,
        x: lineEndX,
        y: lineEndY,
        originalY: lineEndY,
        width: labelMeasure.width,
        height: labelMeasure.height,
        side: lineEndX >= this.centerX ? 'right' : 'left',
        angle: slice.middleAngle
      });
    });

    // Separa etichette per lato e ordina per Y
    const leftLabels = positions.filter(p => p.side === 'left').sort((a, b) => a.y - b.y);
    const rightLabels = positions.filter(p => p.side === 'right').sort((a, b) => a.y - b.y);

    // Risolvi sovrapposizioni per ogni lato
    this.resolveOverlaps(leftLabels, minSpacing);
    this.resolveOverlaps(rightLabels, minSpacing);

    return positions;
  }

  /**
   * Risolve le sovrapposizioni tra etichette dello stesso lato
   */
  resolveOverlaps(labels, minSpacing) {
    if (labels.length <= 1) return;

    const width = this.options.highDPI ? parseFloat(this.canvas.style.width) : this.canvas.width;
    const height = this.options.highDPI ? parseFloat(this.canvas.style.height) : this.canvas.height;

    let titleHeight = this.options.title ? 30 : 0;
    const minY = this.options.padding.top + titleHeight;
    const maxY = height - this.options.padding.bottom;

    // Iterazioni multiple per convergere
    for (let iteration = 0; iteration < 10; iteration++) {
      let hasOverlap = false;

      for (let i = 0; i < labels.length - 1; i++) {
        const current = labels[i];
        const next = labels[i + 1];

        const currentBottom = current.y + current.height / 2;
        const nextTop = next.y - next.height / 2;

        const overlap = currentBottom + minSpacing - nextTop;

        if (overlap > 0) {
          hasOverlap = true;

          // Sposta entrambe le etichette per distribuire meglio
          const shift = overlap / 2;

          // Sposta l'etichetta corrente in su
          if (current.y - shift >= minY + current.height / 2) {
            current.y -= shift;
          }

          // Sposta l'etichetta successiva in giù
          if (next.y + shift <= maxY - next.height / 2) {
            next.y += shift;
          }
        }
      }

      if (!hasOverlap) break;
    }

    // Assicurati che tutte le etichette siano nei limiti
    labels.forEach(label => {
      label.y = Math.max(minY + label.height / 2, Math.min(maxY - label.height / 2, label.y));
    });
  }
  
  draw() {
    const width = this.options.highDPI ? parseFloat(this.canvas.style.width) : this.canvas.width;
    const height = this.options.highDPI ? parseFloat(this.canvas.style.height) : this.canvas.height;

    this.ctx.clearRect(0, 0, width, height);

    if (this.options.title) {
      this.drawTitle();
    }

    this.slices.forEach(slice => {
      this.drawSlice(slice);
    });

    // Calcola posizioni ottimali delle etichette evitando sovrapposizioni
    const labelPositions = this.calculateLabelPositions();

    this.slices.forEach((slice, index) => {
      this.drawConnectorAndLabel(slice, labelPositions[index]);
    });
  }
  
  drawTitle() {
    const width = this.options.highDPI ? parseFloat(this.canvas.style.width) : this.canvas.width;
    
    this.ctx.fillStyle = '#333333';
    this.ctx.font = 'bold 16px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'top';
    this.ctx.fillText(this.options.title, width / 2, this.options.padding.top);
  }
  
  drawSlice(slice) {
    this.ctx.beginPath();
    this.ctx.moveTo(this.centerX, this.centerY);
    this.ctx.arc(
      this.centerX,
      this.centerY,
      this.radius,
      slice.startAngle,
      slice.endAngle
    );
    this.ctx.closePath();
    
    this.ctx.fillStyle = slice.color;
    this.ctx.fill();
    
    // Bordo configurabile
    if (this.options.sliceBorder.width > 0) {
      this.ctx.strokeStyle = this.options.sliceBorder.color;
      this.ctx.lineWidth = this.options.sliceBorder.width;
      this.ctx.stroke();
    }
  }
  
  drawConnectorAndLabel(slice, position) {
    const edgeX = this.centerX + Math.cos(slice.middleAngle) * this.radius;
    const edgeY = this.centerY + Math.sin(slice.middleAngle) * this.radius;

    // Usa la posizione ottimizzata
    const endX = position.x;
    const endY = position.y;

    const bendDistance = this.options.labelDistance;
    const bendX = this.centerX + Math.cos(slice.middleAngle) * (this.radius + bendDistance);
    const bendY = this.centerY + Math.sin(slice.middleAngle) * (this.radius + bendDistance);

    const lineDirection = position.side === 'right' ? 1 : -1;

    // Calcola quanto l'etichetta è stata spostata dalla posizione originale
    const yDisplacement = Math.abs(endY - position.originalY);
    const maxDisplacement = 50; // Soglia oltre la quale la linea diventa più trasparente

    // Calcola l'opacità in base allo spostamento (1.0 = opaco, 0.3 = trasparente)
    const opacity = Math.max(0.3, 1.0 - (yDisplacement / maxDisplacement) * 0.7);

    // Disegna connettore con curva adattiva e opacità variabile
    this.ctx.beginPath();
    this.ctx.moveTo(edgeX, edgeY);

    // Se lo spostamento è grande, usa una curva bezier per una transizione più morbida
    if (yDisplacement > 20) {
      // Punto di controllo per la curva bezier
      const controlX = bendX;
      const controlY = (bendY + endY) / 2;

      this.ctx.lineTo(bendX, bendY);
      this.ctx.quadraticCurveTo(controlX, controlY, endX, endY);
    } else {
      // Linea normale per spostamenti piccoli
      this.ctx.lineTo(bendX, bendY);
      this.ctx.lineTo(endX, endY);
    }

    // Applica colore con opacità
    const connectorColor = this.options.connector.color;
    const rgb = this.hexToRgb(connectorColor);
    this.ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
    this.ctx.lineWidth = this.options.connector.width;
    this.ctx.stroke();

    // Disegna etichetta multi-linea
    const labelText = this.formatLabel(slice);
    const labelMeasure = this.measureLabel(labelText);

    this.ctx.fillStyle = this.options.label.color;
    this.ctx.font = this.options.label.font;

    const fontSizeMatch = this.options.label.font.match(/(\d+)px/);
    const fontSize = fontSizeMatch ? parseInt(fontSizeMatch[1]) : 12;
    const lineHeight = fontSize + 2;

    // Punto di partenza Y (centrato verticalmente)
    let startY = endY - (labelMeasure.height / 2) + (fontSize / 2);

    labelMeasure.lines.forEach((line, index) => {
      const currentY = startY + (index * lineHeight);

      if (lineDirection === 1) {
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(line, endX + 5, currentY);
      } else {
        this.ctx.textAlign = 'right';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(line, endX - 5, currentY);
      }
    });
  }
  
  setData(newData) {
    this.options.data = newData;
    this.calculateLayout();
    this.draw();
  }
  
  updateDataItem(index, newItem) {
    if (index >= 0 && index < this.options.data.length) {
      this.options.data[index] = { ...this.options.data[index], ...newItem };
      this.calculateLayout();
      this.draw();
    }
  }
  
  addDataItem(item) {
    this.options.data.push(item);
    this.calculateLayout();
    this.draw();
  }
  
  removeDataItem(index) {
    if (index >= 0 && index < this.options.data.length) {
      this.options.data.splice(index, 1);
      this.calculateLayout();
      this.draw();
    }
  }
  
  setTitle(title) {
    this.options.title = title;
    this.calculateLayout();
    this.draw();
  }
  
  redraw() {
    this.calculateLayout();
    this.draw();
  }
  
  getTotal() {
    return this.options.data.reduce((sum, item) => sum + item.value, 0);
  }
  
  getSliceAtPoint(x, y) {
    const dx = x - this.centerX;
    const dy = y - this.centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > this.radius) return null;
    
    let angle = Math.atan2(dy, dx);
    if (angle < -Math.PI / 2) {
      angle += 2 * Math.PI;
    }
    
    for (let slice of this.slices) {
      let start = slice.startAngle;
      let end = slice.endAngle;
      
      if (start < -Math.PI / 2) start += 2 * Math.PI;
      if (end < -Math.PI / 2) end += 2 * Math.PI;
      
      if (angle >= start && angle <= end) {
        return slice;
      }
    }
    
    return null;
  }
}

// Esporta le classi per l'uso in moduli
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { HorizontalGauge, PieChart };
}
