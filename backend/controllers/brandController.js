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

// Get All Brands (optional filtering by categoryId)
exports.getBrands = asyncHandler(async (req, res) => {
  const { categoryId, includeInactive } = req.query;

  const where = {};
  if (includeInactive !== 'true') {
    where.isActive = true;
  }

  if (categoryId && !isNaN(parseInt(categoryId))) {
    const catId = parseInt(categoryId);
    where.AND = [
      {
        OR: [
          { categoryId: catId },
          { categoryId: null }
        ]
      }
    ];
  }

  const brands = await prisma.brand.findMany({
    where,
    include: {
      category: true
    },
    orderBy: { name: 'asc' }
  });
  res.json(brands);
});

// Create Brand with Category association
exports.createBrand = asyncHandler(async (req, res) => {
  const { name, categoryId, categoryName, categoryIds } = req.body;
  if (!name || !name.trim()) {
    res.status(400);
    throw new Error('Brand name is required');
  }

  const trimmedName = name.trim();

  // Case-insensitive duplicate check
  const existing = await prisma.brand.findFirst({
    where: {
      name: {
        equals: trimmedName,
        mode: 'insensitive'
      }
    }
  });

  if (existing) {
    res.status(400);
    throw new Error('Brand already exists');
  }

  let brandBarcode = req.body.barcode ? req.body.barcode.trim() : null;

  let resolvedCatId = categoryId && !isNaN(parseInt(categoryId)) ? parseInt(categoryId) : null;
  let resolvedCatName = categoryName || null;

  if (resolvedCatId && !resolvedCatName) {
    const cat = await prisma.category.findUnique({ where: { id: resolvedCatId } });
    if (cat) resolvedCatName = cat.name;
  }

  const data = {
    name: trimmedName,
    barcode: brandBarcode,
    categoryId: resolvedCatId,
    categoryName: resolvedCatName,
    categoryIds: safeJsonParse(categoryIds) || (resolvedCatId ? [resolvedCatId] : [])
  };

  const brand = await prisma.brand.create({
    data,
    include: {
      category: true
    }
  });

  res.status(201).json(brand);
});

// Update Brand
exports.updateBrand = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, barcode, categoryId, categoryName, categoryIds } = req.body;

  const dataToUpdate = {};

  if (name && name.trim()) {
    const trimmedName = name.trim();
    // Check duplicate if name changed
    const existing = await prisma.brand.findFirst({
      where: {
        name: { equals: trimmedName, mode: 'insensitive' },
        NOT: { id: parseInt(id) }
      }
    });

    if (existing) {
      res.status(400);
      throw new Error('Brand with this name already exists');
    }
    dataToUpdate.name = trimmedName;
  }

  if (barcode !== undefined) {
    dataToUpdate.barcode = barcode ? barcode.trim() : null;
  }

  if (categoryId !== undefined) {
    if (categoryId && !isNaN(parseInt(categoryId))) {
      const catId = parseInt(categoryId);
      const cat = await prisma.category.findUnique({ where: { id: catId } });
      dataToUpdate.categoryId = catId;
      dataToUpdate.categoryName = cat?.name || categoryName || null;
    } else {
      dataToUpdate.categoryId = null;
      dataToUpdate.categoryName = null;
    }
  }

  if (categoryIds !== undefined) {
    dataToUpdate.categoryIds = safeJsonParse(categoryIds);
  }

  const brand = await prisma.brand.update({
    where: { id: parseInt(id) },
    data: dataToUpdate,
    include: {
      category: true
    }
  });

  res.json(brand);
});

// Delete Brand (Soft Delete)
exports.deleteBrand = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await prisma.brand.update({
    where: { id: parseInt(id) },
    data: { isActive: false }
  });
  res.json({ message: 'Brand deleted successfully' });
});
