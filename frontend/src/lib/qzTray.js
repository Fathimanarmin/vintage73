import qz from 'qz-tray';

let isConnecting = false;

// Configure QZ security handling for local desktop connection
if (typeof window !== 'undefined') {
  try {
    qz.security.setCertificatePromise((resolve) => {
      // Unsigned mode for local developer / internal production use
      resolve();
    });

    qz.security.setSignatureAlgorithm('SHA512');
    qz.security.setSignaturePromise(() => (resolve) => {
      resolve();
    });
  } catch (e) {
    // Ignore security configuration warnings
  }
}

/**
 * Check if QZ Tray is currently connected
 */
export const isQzConnected = () => {
  try {
    return qz && qz.websocket && qz.websocket.isActive();
  } catch (e) {
    return false;
  }
};

/**
 * Connect to QZ Tray desktop client
 */
export const connectQZ = async () => {
  if (isQzConnected()) return true;
  if (isConnecting) return false;

  isConnecting = true;
  try {
    await qz.websocket.connect({
      retries: 1,
      delay: 1,
      keepAlive: 60
    });
    return true;
  } catch (err) {
    console.warn('QZ Tray connection failed:', err?.message || err);
    throw new Error('QZ_NOT_CONNECTED');
  } finally {
    isConnecting = false;
  }
};

/**
 * Get available printer name (preferring Zebra, or default printer)
 */
export const resolvePrinter = async (preferredName) => {
  if (!isQzConnected()) {
    await connectQZ();
  }

  // 1. If preferred name provided, check if it exists
  if (preferredName) {
    try {
      const matched = await qz.printers.find(preferredName);
      if (matched) return matched;
    } catch (e) {
      // Fallback
    }
  }

  // 2. Look for Zebra or TSC branded printer
  try {
    const zebra = await qz.printers.find('Zebra');
    if (zebra) return zebra;
  } catch (e) {
    // Fallback
  }
  try {
    const tsc = await qz.printers.find('TSC');
    if (tsc) return tsc;
  } catch (e) {
    // Fallback
  }

  // 3. Fallback to system default printer
  try {
    const defaultPrinter = await qz.printers.getDefault();
    if (defaultPrinter) return defaultPrinter;
  } catch (e) {
    // Fallback
  }

  // 4. Fallback to first available printer
  try {
    const allPrinters = await qz.printers.find();
    if (Array.isArray(allPrinters) && allPrinters.length > 0) {
      return allPrinters[0];
    }
  } catch (e) {
    // Fallback
  }

  throw new Error('NO_PRINTER_FOUND');
};

/**
 * Print raw ZPL via QZ Tray with exact copy count
 * @param {string} zpl - Raw ZPL string
 * @param {number} quantity - Number of physical label copies
 * @param {string} [preferredPrinter] - Optional target printer name
 */
export const printZplViaQz = async (zpl, quantity = 1, preferredPrinter = null) => {
  const qty = parseInt(quantity, 10);
  if (isNaN(qty) || qty <= 0) {
    throw new Error('Invalid print quantity. Must be at least 1.');
  }

  // Ensure connection
  try {
    if (!isQzConnected()) {
      await connectQZ();
    }
  } catch (err) {
    throw new Error('QZ_NOT_CONNECTED');
  }

  // Resolve printer
  let printer;
  try {
    printer = await resolvePrinter(preferredPrinter);
  } catch (err) {
    throw new Error('NO_PRINTER_FOUND');
  }

  // Ensure copy count in ZPL or QZ config
  let finalZpl = zpl;
  if (/\^PQ\d+/i.test(finalZpl)) {
    finalZpl = finalZpl.replace(/\^PQ\d+[^\\^]*/gi, `^PQ${qty},0,0,N`);
  } else if (/\^XZ/i.test(finalZpl)) {
    finalZpl = finalZpl.replace(/\^XZ/gi, `^PQ${qty},0,0,N\n^XZ`);
  } else {
    finalZpl = `${finalZpl}\n^PQ${qty},0,0,N\n^XZ`;
  }

  // Create QZ config with exact copies
  const config = qz.configs.create(printer, {
    copies: 1 // Quantity already embedded into Zebra ^PQ command for hardware-level replication
  });

  const printData = [
    {
      type: 'raw',
      format: 'command',
      flavor: 'plain',
      data: finalZpl
    }
  ];

  await qz.print(config, printData);
  return {
    success: true,
    printer,
    quantity: qty,
    message: `Printed ${qty} label(s) on "${printer}" via QZ Tray.`
  };
};

/**
 * Print raster image via QZ Tray (works on ALL thermal & Windows printers including TSC, Xprinter, Zebra)
 * @param {string} imageDataUrl - Base64 data URL or raw base64 string
 * @param {number} quantity - Number of physical label copies
 * @param {string} [preferredPrinter] - Optional target printer name
 */
export const printImageViaQz = async (imageDataUrl, quantity = 1, preferredPrinter = null) => {
  const qty = parseInt(quantity, 10);
  if (isNaN(qty) || qty <= 0) {
    throw new Error('Invalid print quantity. Must be at least 1.');
  }

  if (!isQzConnected()) {
    await connectQZ();
  }

  let printer;
  try {
    printer = await resolvePrinter(preferredPrinter);
  } catch (err) {
    throw new Error('NO_PRINTER_FOUND');
  }

  let base64Data = imageDataUrl;
  if (base64Data.includes(',')) {
    base64Data = base64Data.split(',')[1];
  }

  const config = qz.configs.create(printer, {
    copies: qty,
    scaleContent: true
  });

  const printData = [
    {
      type: 'pixel',
      format: 'image',
      flavor: 'base64',
      data: base64Data
    }
  ];

  await qz.print(config, printData);
  return {
    success: true,
    printer,
    quantity: qty,
    message: `Printed ${qty} label(s) on "${printer}" via QZ Tray.`
  };
};

/**
 * Get list of all installed printers via QZ Tray
 */
export const getAvailablePrinters = async () => {
  if (!isQzConnected()) {
    await connectQZ();
  }
  try {
    const list = await qz.printers.find();
    return Array.isArray(list) ? list : [];
  } catch (e) {
    console.warn('Error fetching printers from QZ Tray:', e);
    return [];
  }
};

export default {
  connectQZ,
  isQzConnected,
  resolvePrinter,
  printZplViaQz,
  printImageViaQz,
  getAvailablePrinters
};
