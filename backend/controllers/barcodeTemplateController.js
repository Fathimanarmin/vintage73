const axios = require('axios');
const prisma = require('../config/prisma');
const asyncHandler = require('../middleware/asyncHandler');

// @desc    Get all barcode templates
// @route   GET /api/barcode-templates
exports.getAllTemplates = asyncHandler(async (req, res) => {
    const templates = await prisma.barcodeTemplate.findMany({
        orderBy: { name: 'asc' },
        include: {
            _count: {
                select: { categories: true }
            }
        }
    });
    res.json(templates);
});

// @desc    Get single barcode template by ID
// @route   GET /api/barcode-templates/:id
exports.getTemplateById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const template = await prisma.barcodeTemplate.findUnique({
        where: { id: parseInt(id) }
    });

    if (!template) {
        res.status(404);
        throw new Error('Barcode template not found');
    }

    res.json(template);
});

// @desc    Create new barcode template
// @route   POST /api/barcode-templates
exports.createTemplate = asyncHandler(async (req, res) => {
    const { name, rawZpl, labelWidth = 40, labelHeight = 20, dpi = 203 } = req.body;

    if (!name || !name.trim()) {
        res.status(400);
        throw new Error('Template Name is required');
    }

    if (rawZpl === undefined || rawZpl === null) {
        res.status(400);
        throw new Error('Raw ZPL code is required');
    }

    const trimmedName = name.trim();

    const existing = await prisma.barcodeTemplate.findUnique({
        where: { name: trimmedName }
    });

    if (existing) {
        res.status(400);
        throw new Error(`Template with name "${trimmedName}" already exists`);
    }

    // Preserve exact ZPL and save template-specific dimensions
    const template = await prisma.barcodeTemplate.create({
        data: {
            name: trimmedName,
            rawZpl: String(rawZpl),
            labelWidth: labelWidth !== undefined && labelWidth !== null ? parseFloat(labelWidth) : 40,
            labelHeight: labelHeight !== undefined && labelHeight !== null ? parseFloat(labelHeight) : 20,
            dpi: dpi !== undefined && dpi !== null ? parseInt(dpi, 10) : 203
        }
    });

    res.status(201).json(template);
});

// @desc    Update barcode template
// @route   PUT /api/barcode-templates/:id
exports.updateTemplate = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, rawZpl, labelWidth, labelHeight, dpi } = req.body;
    const templateId = parseInt(id);

    const existing = await prisma.barcodeTemplate.findUnique({
        where: { id: templateId }
    });

    if (!existing) {
        res.status(404);
        throw new Error('Barcode template not found');
    }

    const dataToUpdate = {};

    if (name !== undefined) {
        const trimmedName = name.trim();
        if (!trimmedName) {
            res.status(400);
            throw new Error('Template Name cannot be empty');
        }

        if (trimmedName !== existing.name) {
            const nameConflict = await prisma.barcodeTemplate.findUnique({
                where: { name: trimmedName }
            });
            if (nameConflict) {
                res.status(400);
                throw new Error(`Template with name "${trimmedName}" already exists`);
            }
        }
        dataToUpdate.name = trimmedName;
    }

    if (rawZpl !== undefined && rawZpl !== null) {
        dataToUpdate.rawZpl = String(rawZpl);
    }

    if (labelWidth !== undefined && labelWidth !== null) {
        dataToUpdate.labelWidth = parseFloat(labelWidth);
    }

    if (labelHeight !== undefined && labelHeight !== null) {
        dataToUpdate.labelHeight = parseFloat(labelHeight);
    }

    if (dpi !== undefined && dpi !== null) {
        dataToUpdate.dpi = parseInt(dpi, 10);
    }

    const updated = await prisma.barcodeTemplate.update({
        where: { id: templateId },
        data: dataToUpdate
    });

    res.json(updated);
});

// @desc    Render ZPL to PNG preview via Labelary API
// @route   POST /api/barcode-templates/render-preview
exports.renderPreview = asyncHandler(async (req, res) => {
    const { zpl, labelWidth = 40, labelHeight = 20, dpi = 203, sampleProduct } = req.body;

    if (!zpl || !zpl.trim()) {
        res.status(400);
        throw new Error('ZPL code is required for preview');
    }

    const widthMm = parseFloat(labelWidth) || 40;
    const heightMm = parseFloat(labelHeight) || 20;
    const dpiInt = parseInt(dpi, 10) || 203;

    const dpmm = dpiInt === 300 ? '12dpmm' : dpiInt === 600 ? '24dpmm' : '8dpmm';
    const widthInches = (widthMm / 25.4).toFixed(2);
    const heightInches = (heightMm / 25.4).toFixed(2);

    const labelaryUrl = `http://api.labelary.com/v1/printers/${dpmm}/labels/${widthInches}x${heightInches}/0/`;

    // Dynamically map product data placeholders to actual/sample product values
    const prod = sampleProduct || {
        name: 'PENDANT',
        barcode: 'SK1252612334',
        price: '1500'
    };

    const pName = prod.name || prod.productName || 'PENDANT';
    const pBarcode = prod.barcode || 'SK1252612334';
    const pPrice = prod.price !== undefined && prod.price !== null ? String(prod.price) : '1500';

    const replacements = {
        productName: pName,
        name: pName,
        product_name: pName,
        'product name': pName,
        barcode: pBarcode,
        barcodeNumber: pBarcode,
        barcode_number: pBarcode,
        'barcode number': pBarcode,
        sku: pBarcode,
        price: pPrice,
        mrp: pPrice,
        'price/mrp': pPrice,
        price_mrp: pPrice,
        sellingPrice: pPrice,
        selling_price: pPrice,
        size: prod.size || '',
        branchName: prod.branchName || prod.branch_name || prod.branch || '',
        branch_name: prod.branchName || prod.branch_name || prod.branch || '',
        branch: prod.branchName || prod.branch_name || prod.branch || '',
        category: prod.categoryName || ''
    };

    let resolvedZpl = zpl;
    Object.entries(replacements).forEach(([key, val]) => {
        const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regexDouble = new RegExp(`\\{\\{\\s*${escapedKey}\\s*\\}\\}`, 'gi');
        const regexSingle = new RegExp(`\\{\\s*${escapedKey}\\s*\\}`, 'gi');
        resolvedZpl = resolvedZpl.replace(regexDouble, val).replace(regexSingle, val);
    });

    if (sampleProduct) {
        if (prod.barcode) {
            resolvedZpl = resolvedZpl.replace(/SK1252612334/g, prod.barcode)
                                     .replace(/SK1252612335/g, prod.barcode);
        }
        if (prod.name) {
            resolvedZpl = resolvedZpl.replace(/PENDANT/g, prod.name);
        }
        if (prod.price !== undefined && prod.price !== null) {
            resolvedZpl = resolvedZpl.replace(/\^FD1500\^FS/g, `^FD${prod.price}^FS`);
        }
    }

    try {
        const response = await axios.post(labelaryUrl, resolvedZpl, {
            headers: {
                'Accept': 'image/png',
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            responseType: 'arraybuffer',
            timeout: 10000
        });

        const base64Image = Buffer.from(response.data, 'binary').toString('base64');
        res.json({
            success: true,
            image: `data:image/png;base64,${base64Image}`,
            dimensions: {
                widthMm,
                labelWidth: widthMm,
                heightMm,
                labelHeight: heightMm,
                dpi: dpiInt,
                widthInches,
                heightInches,
                dpmm,
                calculatedPw: Math.round(widthMm * (dpiInt === 300 ? 12 : dpiInt === 600 ? 24 : 8)),
                calculatedLl: Math.round(heightMm * (dpiInt === 300 ? 12 : dpiInt === 600 ? 24 : 8))
            }
        });
    } catch (error) {
        console.error('Labelary preview rendering error:', error.message);
        res.status(502).json({
            success: false,
            message: 'Failed to render ZPL preview via Labelary service: ' + (error.response?.data ? error.response.data.toString() : error.message)
        });
    }
});

// @desc    Delete barcode template
// @route   DELETE /api/barcode-templates/:id
exports.deleteTemplate = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const templateId = parseInt(id);

    const existing = await prisma.barcodeTemplate.findUnique({
        where: { id: templateId }
    });

    if (!existing) {
        res.status(404);
        throw new Error('Barcode template not found');
    }

    // Deleting template safely; onDelete: SetNull on Category will automatically nullify defaultLabelDesignId
    await prisma.barcodeTemplate.delete({
        where: { id: templateId }
    });

    res.json({ message: 'Template deleted successfully' });
});

// @desc    Send raw ZPL to network Zebra printer or print service
// @route   POST /api/barcode-templates/print-zpl
exports.printZpl = asyncHandler(async (req, res) => {
    const { zpl, quantity = 1, printerIp, printerPort } = req.body;

    if (!zpl) {
        res.status(400);
        throw new Error('ZPL string is required');
    }

    const qty = parseInt(quantity, 10) || 1;
    let finalZpl = zpl;
    if (qty > 0) {
        if (/\^PQ\d+/i.test(finalZpl)) {
            finalZpl = finalZpl.replace(/\^PQ\d+[^\\^]*/gi, `^PQ${qty},0,0,N`);
        } else if (/\^XZ/i.test(finalZpl)) {
            finalZpl = finalZpl.replace(/\^XZ/gi, `^PQ${qty},0,0,N\n^XZ`);
        } else {
            finalZpl = `${finalZpl}\n^PQ${qty},0,0,N\n^XZ`;
        }
    }

    const host = printerIp || process.env.ZEBRA_PRINTER_IP || process.env.PRINTER_HOST;
    const port = parseInt(printerPort || process.env.ZEBRA_PRINTER_PORT || process.env.PRINTER_PORT || 9100, 10);

    if (host) {
        const net = require('net');
        return new Promise((resolve) => {
            const socket = new net.Socket();
            socket.setTimeout(3000);

            socket.connect(port, host, () => {
                socket.write(finalZpl, () => {
                    socket.end();
                    res.json({ success: true, message: `Sent ${qty} label(s) to Zebra printer at ${host}:${port}` });
                    resolve();
                });
            });

            socket.on('error', (err) => {
                socket.destroy();
                res.status(500).json({ success: false, message: `Failed to connect to printer at ${host}:${port}: ${err.message}` });
                resolve();
            });

            socket.on('timeout', () => {
                socket.destroy();
                res.status(504).json({ success: false, message: `Connection to printer timed out at ${host}:${port}` });
                resolve();
            });
        });
    }

    res.json({
        success: false,
        configured: false,
        message: 'No network printer host configured'
    });
});
