const prisma = require('../config/prisma');
const asyncHandler = require('../middleware/asyncHandler');

// Helper to safely parse JSON if string
const safeJsonParse = (val) => {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'object') return val;
  try {
    return JSON.parse(val);
  } catch (e) {
    return null;
  }
};

// Get All Products
exports.getAllProducts = asyncHandler(async (req, res) => {
  const { branchId: queryBranchId } = req.query;
  const user = req.user;

  // --- BRANCH ENFORCEMENT ---
  let branchId = queryBranchId;
  const isGlobalAdmin = user?.role === 'admin' && !user?.branchId;

  if (!isGlobalAdmin) {
    // Non-global admins (Branch Admin/Staff) are locked to their own branch stock
    branchId = user.branchId;
  }

  const parsedBranchId = branchId && !isNaN(parseInt(branchId)) ? parseInt(branchId) : undefined;

  const whereClause = {};

  // Visibility Rule: Only admins can see inactive products
  if (user?.role !== 'admin') {
    whereClause.isActive = true;
  }

  const products = await prisma.product.findMany({
    where: whereClause,
    include: {
      category: {
        include: {
          defaultLabelDesign: true
        }
      },
      productType: true,
      brand: true,
      stocks: parsedBranchId ? {
        where: { branchId: parsedBranchId }
      } : true
    },
    orderBy: { createdAt: 'desc' }
  });

  // Map stock to a flat structure for frontend compatibility
  const formattedProducts = products.map(p => ({
    ...p,
    // If parsedBranchId is present, we only show stock for THAT branch.
    // If no stock entry exists for that branch, we default to 0.
    stock: parsedBranchId ? (p.stocks[0]?.quantity || 0) : p.stocks.reduce((acc, s) => acc + s.quantity, 0)
  }));

  res.json(formattedProducts);
});

// Create Product
exports.createProduct = asyncHandler(async (req, res) => {
  let {
    name,
    brandId,
    brandName,
    price,
    taxRate,
    taxType,
    taxPercent,
    hsnCode,
    warranty,
    description,
    barcode,
    hasBarcode,
    categoryName,
    categoryId,
    productTypeId,
    productTypeName,
    gender,
    attributes,
    size,
    sizeStocks,
    stock,
    initialStock,
    minDiscount,
    maxDiscount,
    isTaxInclusive
  } = req.body;

  // Handle Image Upload
  let imageUrl = null;
  if (req.file) {
    imageUrl = '/uploads/' + req.file.filename;
  }

  // If brand is selected, resolve Brand's barcode
  if (brandId && !isNaN(parseInt(brandId))) {
    const assignedBrand = await prisma.brand.findUnique({ where: { id: parseInt(brandId) } });
    if (assignedBrand) {
      brandName = assignedBrand.name;
      if (assignedBrand.barcode) {
        barcode = assignedBrand.barcode;
      }
    }
  }

  // Auto-generate barcode if missing and enabled
  if ((hasBarcode === 'true' || hasBarcode === true) && !barcode) {
    barcode = 'BC' + Date.now().toString().slice(-10) + Math.floor(Math.random() * 1000).toString();
  }

  const priceDecimal = parseFloat(price);
  const taxVal = taxPercent !== undefined ? taxPercent : (taxRate !== undefined ? taxRate : 0);
  const taxRateDecimal = parseFloat(taxVal) || 0;

  // Parse complex JSON fields
  const parsedAttributes = safeJsonParse(attributes);
  const parsedSizeStocks = safeJsonParse(sizeStocks);

  // Determine stock quantity
  let totalStockQty = 0;
  if (parsedSizeStocks && Array.isArray(parsedSizeStocks) && parsedSizeStocks.length > 0) {
    totalStockQty = parsedSizeStocks.reduce((sum, item) => sum + (parseInt(item.stock, 10) || 0), 0);
  } else if (stock !== undefined && stock !== '') {
    totalStockQty = parseInt(stock, 10) || 0;
  } else if (initialStock !== undefined && initialStock !== '') {
    totalStockQty = parseInt(initialStock, 10) || 0;
  }

  try {
    const data = {
      name,
      categoryName,
      productTypeName,
      brandName: brandName || null,
      gender: gender || null,
      attributes: parsedAttributes || undefined,
      size: size || null,
      sizeStocks: parsedSizeStocks || undefined,
      price: !isNaN(priceDecimal) ? priceDecimal : 0,
      taxType,
      taxRate: taxRateDecimal,
      taxPercent: taxRateDecimal,
      hsnCode,
      warranty: !isNaN(parseInt(warranty)) ? parseInt(warranty) : 0,
      description,
      barcode,
      hasBarcode: (hasBarcode === 'true' || hasBarcode === true) || false,
      minDiscount: minDiscount ? parseFloat(minDiscount) : null,
      maxDiscount: maxDiscount ? parseFloat(maxDiscount) : null,
      isTaxInclusive: (isTaxInclusive === 'true' || isTaxInclusive === true) || false,
      imageUrl: imageUrl,
      isActive: req.body.isActive !== undefined ? (req.body.isActive === 'true' || req.body.isActive === true) : true
    };

    if (brandId && !isNaN(parseInt(brandId))) {
      data.brand = { connect: { id: parseInt(brandId) } };
    }

    if (categoryId && !isNaN(parseInt(categoryId))) {
      data.category = { connect: { id: parseInt(categoryId) } };
    }

    if (productTypeId && !isNaN(parseInt(productTypeId))) {
      data.productType = { connect: { id: parseInt(productTypeId) } };
    }

    const product = await prisma.product.create({
      data,
      include: {
        category: {
          include: {
            defaultLabelDesign: true
          }
        },
        productType: true,
        brand: true,
        stocks: true
      }
    });

    // Synchronize initial stock with ProductStock if branch is available
    const branchId = req.body.branchId ? parseInt(req.body.branchId) : (req.user?.branchId || null);
    let targetBranchId = branchId;

    if (!targetBranchId) {
      const firstBranch = await prisma.branch.findFirst({ where: { isActive: true } });
      if (firstBranch) targetBranchId = firstBranch.id;
    }

    if (targetBranchId && totalStockQty >= 0) {
      await prisma.productStock.upsert({
        where: {
          branchId_productId: {
            branchId: targetBranchId,
            productId: product.id
          }
        },
        update: { quantity: totalStockQty },
        create: {
          branchId: targetBranchId,
          productId: product.id,
          quantity: totalStockQty
        }
      });
    }

    res.status(201).json(product);
  } catch (error) {
    if (error.code === 'P2002') {
      res.status(400);
      throw new Error('Barcode already exists');
    }
    throw error;
  }
});

// Update Product
exports.updateProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    name,
    brandId,
    brandName,
    price,
    taxRate,
    taxPercent,
    taxType,
    hsnCode,
    warranty,
    description,
    barcode,
    categoryName,
    categoryId,
    productTypeId,
    productTypeName,
    gender,
    attributes,
    size,
    sizeStocks,
    stock,
    minDiscount,
    maxDiscount,
    isTaxInclusive,
    isActive
  } = req.body;

  const dataToUpdate = {};

  if (name !== undefined) dataToUpdate.name = name;
  if (categoryName !== undefined) dataToUpdate.categoryName = categoryName;
  if (productTypeName !== undefined) dataToUpdate.productTypeName = productTypeName;
  if (gender !== undefined) dataToUpdate.gender = gender || null;
  if (size !== undefined) dataToUpdate.size = size || null;
  if (taxType !== undefined) dataToUpdate.taxType = taxType;
  if (hsnCode !== undefined) dataToUpdate.hsnCode = hsnCode;
  if (description !== undefined) dataToUpdate.description = description;
  if (barcode !== undefined) dataToUpdate.barcode = barcode;

  if (brandId !== undefined) {
    if (brandId && !isNaN(parseInt(brandId))) {
      const assignedBrand = await prisma.brand.findUnique({ where: { id: parseInt(brandId) } });
      dataToUpdate.brand = { connect: { id: parseInt(brandId) } };
      dataToUpdate.brandName = assignedBrand?.name || brandName || null;
      if (assignedBrand?.barcode) {
        dataToUpdate.barcode = assignedBrand.barcode;
      }
    } else {
      dataToUpdate.brand = { disconnect: true };
      dataToUpdate.brandName = null;
    }
  } else if (brandName !== undefined) {
    dataToUpdate.brandName = brandName;
  }

  if (attributes !== undefined) {
    dataToUpdate.attributes = safeJsonParse(attributes);
  }

  if (sizeStocks !== undefined) {
    dataToUpdate.sizeStocks = safeJsonParse(sizeStocks);
  }

  if (price !== undefined && !isNaN(parseFloat(price))) {
    dataToUpdate.price = parseFloat(price);
  }

  if (taxRate !== undefined || taxPercent !== undefined) {
    const taxVal = taxRate !== undefined ? taxRate : taxPercent;
    const parsedTax = parseFloat(taxVal) || 0;
    dataToUpdate.taxRate = parsedTax;
    dataToUpdate.taxPercent = parsedTax;
  }

  if (warranty !== undefined) {
    dataToUpdate.warranty = !isNaN(parseInt(warranty)) ? parseInt(warranty) : 0;
  }

  if (minDiscount !== undefined) dataToUpdate.minDiscount = minDiscount ? parseFloat(minDiscount) : null;
  if (maxDiscount !== undefined) dataToUpdate.maxDiscount = maxDiscount ? parseFloat(maxDiscount) : null;

  if (isTaxInclusive !== undefined) {
    dataToUpdate.isTaxInclusive = (isTaxInclusive === 'true' || isTaxInclusive === true);
  }

  if (isActive !== undefined) {
    dataToUpdate.isActive = (isActive === 'true' || isActive === true);
  }

  if (categoryId !== undefined) {
    if (categoryId && !isNaN(parseInt(categoryId))) {
      dataToUpdate.category = { connect: { id: parseInt(categoryId) } };
    } else {
      dataToUpdate.category = { disconnect: true };
    }
  }

  if (productTypeId !== undefined) {
    if (productTypeId && !isNaN(parseInt(productTypeId))) {
      dataToUpdate.productType = { connect: { id: parseInt(productTypeId) } };
    } else {
      dataToUpdate.productType = { disconnect: true };
    }
  }

  if (req.file) {
    dataToUpdate.imageUrl = '/uploads/' + req.file.filename;
  }

  const product = await prisma.product.update({
    where: { id: parseInt(id) },
    data: dataToUpdate,
    include: {
      category: {
        include: {
          defaultLabelDesign: true
        }
      },
      productType: true,
      brand: true,
      stocks: true
    }
  });

  // If sizeStocks or stock explicitly changed, update ProductStock for branch
  const parsedSizeStocks = safeJsonParse(sizeStocks);
  let updatedStockQty = null;

  if (parsedSizeStocks && Array.isArray(parsedSizeStocks) && parsedSizeStocks.length > 0) {
    updatedStockQty = parsedSizeStocks.reduce((sum, item) => sum + (parseInt(item.stock, 10) || 0), 0);
  } else if (stock !== undefined && stock !== '' && !isNaN(parseInt(stock, 10))) {
    updatedStockQty = parseInt(stock, 10);
  }

  if (updatedStockQty !== null) {
    const branchId = req.body.branchId ? parseInt(req.body.branchId) : (req.user?.branchId || null);
    let targetBranchId = branchId;

    if (!targetBranchId) {
      const firstBranch = await prisma.branch.findFirst({ where: { isActive: true } });
      if (firstBranch) targetBranchId = firstBranch.id;
    }

    if (targetBranchId) {
      await prisma.productStock.upsert({
        where: {
          branchId_productId: {
            branchId: targetBranchId,
            productId: parseInt(id)
          }
        },
        update: { quantity: updatedStockQty },
        create: {
          branchId: targetBranchId,
          productId: parseInt(id),
          quantity: updatedStockQty
        }
      });
    }
  }

  res.json(product);
});

// Delete Product
exports.deleteProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await prisma.product.delete({ where: { id: parseInt(id) } });
  res.json({ message: 'Product deleted' });
});
