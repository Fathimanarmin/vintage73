const prisma = require('../config/prisma');
const asyncHandler = require('../middleware/asyncHandler');

// Get All Categories (includes attributes for Product Type inheritance and default label design)
exports.getAllCategories = asyncHandler(async (req, res) => {
    const categories = await prisma.category.findMany({
        orderBy: { name: 'asc' },
        include: {
            defaultLabelDesign: true,
            _count: {
                select: { products: true }
            }
        }
    });
    res.json(categories);
});

// Get Category Attributes by ID
// @route GET /api/categories/:id/attributes
exports.getCategoryAttributes = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const category = await prisma.category.findUnique({
        where: { id: parseInt(id) },
        select: { id: true, name: true, attributes: true, defaultLabelDesignId: true, defaultLabelDesign: true }
    });

    if (!category) {
        res.status(404);
        throw new Error('Category not found');
    }

    // attributes is stored as a JSON array; return it (or empty array if null)
    res.json({
        id: category.id,
        name: category.name,
        attributes: Array.isArray(category.attributes) ? category.attributes : [],
        defaultLabelDesignId: category.defaultLabelDesignId,
        defaultLabelDesign: category.defaultLabelDesign
    });
});

// Create Category
exports.createCategory = asyncHandler(async (req, res) => {
    const { name, unitType, attributes, defaultLabelDesignId } = req.body;
    try {
        const category = await prisma.category.create({
            data: {
                name,
                unitType,
                attributes: Array.isArray(attributes) ? attributes : [],
                defaultLabelDesignId: defaultLabelDesignId ? parseInt(defaultLabelDesignId) : null
            },
            include: {
                defaultLabelDesign: true
            }
        });
        res.status(201).json(category);
    } catch (error) {
        if (error.code === 'P2002') {
            res.status(400);
            throw new Error('Category already exists');
        }
        throw error;
    }
});

// Update Category
exports.updateCategory = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, unitType, attributes, defaultLabelDesignId } = req.body;
    try {
        const dataToUpdate = {};
        if (name !== undefined) dataToUpdate.name = name;
        if (unitType !== undefined) dataToUpdate.unitType = unitType;
        if (attributes !== undefined) dataToUpdate.attributes = Array.isArray(attributes) ? attributes : [];
        if (defaultLabelDesignId !== undefined) {
            dataToUpdate.defaultLabelDesignId = defaultLabelDesignId ? parseInt(defaultLabelDesignId) : null;
        }

        const category = await prisma.category.update({
            where: { id: parseInt(id) },
            data: dataToUpdate,
            include: {
                defaultLabelDesign: true
            }
        });
        res.json(category);
    } catch (error) {
        if (error.code === 'P2002') {
            res.status(400);
            throw new Error('Category name already exists');
        }
        throw error;
    }
});

// Delete Category
exports.deleteCategory = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    // Check if category has products
    const category = await prisma.category.findUnique({
        where: { id: parseInt(id) },
        include: { _count: { select: { products: true } } }
    });

    if (category && category._count.products > 0) {
        res.status(400);
        throw new Error('Cannot delete category with associated products');
    }

    await prisma.category.delete({
        where: { id: parseInt(id) }
    });
    res.json({ message: 'Category deleted' });
});
