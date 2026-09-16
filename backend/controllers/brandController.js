const prisma = require('../config/prisma');
const asyncHandler = require('../middleware/asyncHandler');

// Get All Brands
exports.getBrands = asyncHandler(async (req, res) => {
  const brands = await prisma.brand.findMany({
    orderBy: { name: 'asc' }
  });
  res.json(brands);
});

// Create Brand with trimmed, case-insensitive duplicate check
exports.createBrand = asyncHandler(async (req, res) => {
  const { name } = req.body;
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
  if (!brandBarcode) {
    brandBarcode = 'BC' + Date.now().toString().slice(-10) + Math.floor(Math.random() * 1000).toString();
  }

  const brand = await prisma.brand.create({
    data: {
      name: trimmedName,
      barcode: brandBarcode
    }
  });

  res.status(201).json(brand);
});
