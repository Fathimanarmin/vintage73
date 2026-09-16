import { useState, useEffect, useMemo } from 'react';
import api from '@/lib/api';
import { FiPlus, FiPrinter, FiSearch, FiEdit, FiTrash2, FiBox, FiToggleLeft, FiToggleRight, FiLayers, FiTag, FiCheck, FiInfo, FiEye, FiX } from 'react-icons/fi';
import Barcode from 'react-barcode';
import { toast } from 'react-toastify';
import SearchableSelect from '@/components/SearchableSelect';

const DEFAULT_GENDERS = ['Men', 'Women', 'Boy', 'Girl', 'Unisex'];

export default function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [productTypes, setProductTypes] = useState([]);
  const [companyProfile, setCompanyProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const initialFormState = {
    id: null,
    name: '',
    categoryId: '',
    categoryName: '',
    productTypeId: '',
    productTypeName: '',
    gender: '',
    attributes: {},
    sizeMode: 'single', // 'single' or 'multi'
    size: '',
    sizeStocks: [],
    stock: '0',
    price: '',
    costPrice: '',
    taxRate: '0',
    taxType: 'none',
    taxPercent: '0',
    hsnCode: '',
    warranty: '0',
    description: '',
    barcode: '',
    hasBarcode: true,
    minDiscount: '',
    maxDiscount: '',
    isTaxInclusive: false,
    isActive: true
  };

  const [formData, setFormData] = useState(initialFormState);
  const [file, setFile] = useState(null); // For Image Upload
  const [imagePreview, setImagePreview] = useState(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusTarget, setStatusTarget] = useState(null);

  // Barcode Label Resolution, Preview & Print State
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [previewDimensions, setPreviewDimensions] = useState(null);
  const [resolvedLabelTemplate, setResolvedLabelTemplate] = useState(null);
  const [resolvedZpl, setResolvedZpl] = useState('');
  const [printTargetProduct, setPrintTargetProduct] = useState(null);
  const [printQuantity, setPrintQuantity] = useState(1);

  const [barcodeSettings, setBarcodeSettings] = useState({
    nameFontSize: 20,
    priceFontSize: 16,
    barcodeWidth: 2,
    barcodeHeight: 100,
    barcodeFontSize: 18,
    alignment: 'center',
    showName: true,
    showPrice: true,
    showBarcodeValue: true,
    paperSize: 'Single',
    columns: 1,
    margin: 10,
    labelWidth: 40,
    labelHeight: 20,
    paperWidth: 210,
    columnGap: 5,
    rowGap: 5
  });

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterProductType, setFilterProductType] = useState('');
  const [filterStock, setFilterStock] = useState('all'); // all, low, out

  const fetchProducts = async () => {
    try {
      const storedUser = localStorage.getItem('user');
      const branchId = storedUser ? JSON.parse(storedUser).branchId : null;
      const [prodRes, compRes, catRes, ptRes] = await Promise.all([
        api.get('/products', { params: { branchId } }),
        api.get('/company'),
        api.get('/categories'),
        api.get('/product-types')
      ]);
      setProducts(prodRes.data);
      setCompanyProfile(compRes.data);
      setCategories(catRes.data);
      setProductTypes(ptRes.data);

      if (branchId) {
        try {
          const { data: bSetting } = await api.get(`/barcode-settings/${branchId}`);
          if (bSetting) {
            setBarcodeSettings(prev => ({
              ...prev,
              ...bSetting,
              labelWidth: bSetting.labelWidth ?? 40,
              labelHeight: bSetting.labelHeight ?? 20,
              paperWidth: bSetting.paperWidth ?? 210,
              columnGap: bSetting.columnGap ?? 5,
              rowGap: bSetting.rowGap ?? 5
            }));
          }
        } catch (e) {
          // ignore error fetching branch barcode settings
        }
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to fetch products');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPrintModal = async (product) => {
    if (!product.barcode) {
      toast.error('This product does not have a barcode assigned.');
      return;
    }

    // 1. Resolve Product Category
    let productCat = null;
    const catId = product.categoryId || product.category?.id;
    if (catId) {
      productCat = categories.find(c => String(c.id) === String(catId));
    }
    if (!productCat && product.category && typeof product.category === 'object') {
      productCat = product.category;
    }
    if (!productCat && product.categoryName) {
      productCat = categories.find(c => c.name?.toLowerCase() === product.categoryName.toLowerCase());
    }
    if (!productCat && typeof product.category === 'string') {
      productCat = categories.find(c => c.name?.toLowerCase() === product.category.toLowerCase());
    }

    // 2. Get Category's configured Default Label Design
    let labelTemplate = productCat?.defaultLabelDesign;
    let templateId = productCat?.defaultLabelDesignId || labelTemplate?.id;

    // Refresh category attributes if defaultLabelDesignId not yet attached
    if (!templateId && productCat?.id) {
      try {
        const { data: catDetails } = await api.get(`/categories/${productCat.id}/attributes`);
        if (catDetails?.defaultLabelDesignId) {
          templateId = catDetails.defaultLabelDesignId;
          labelTemplate = catDetails.defaultLabelDesign;
        }
      } catch (e) {
        console.warn('Could not fetch category details:', e);
      }
    }

    // If template object is not loaded or missing rawZpl, fetch by templateId
    if ((!labelTemplate || !labelTemplate.rawZpl) && templateId) {
      try {
        const { data: tpl } = await api.get(`/barcode-templates/${templateId}`);
        labelTemplate = tpl;
      } catch (e) {
        console.warn('Could not fetch template by ID:', e);
      }
    }

    if (!labelTemplate || !labelTemplate.rawZpl) {
      toast.warning(
        productCat
          ? `Category "${productCat.name}" does not have a Default Label Design configured. Please select one in Category Master.`
          : `This product does not have a category assigned with a Default Label Design. Please assign in Category Master.`
      );
      return;
    }

    // 3. Populate product data into Raw ZPL
    let zpl = labelTemplate.rawZpl;

    const priceStr = product.price !== undefined && product.price !== null ? String(product.price) : '0';
    const pName = product.name || '';
    const pBarcode = product.barcode || '';

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
      price: priceStr,
      mrp: priceStr,
      'price/mrp': priceStr,
      price_mrp: priceStr,
      sellingPrice: priceStr,
      selling_price: priceStr,
      size: product.size || '',
      category: product.categoryName || productCat?.name || '',
      company: companyProfile?.companyName || ''
    };

    // Replace both {placeholder} and {{placeholder}} case-insensitively
    Object.entries(replacements).forEach(([key, val]) => {
      const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regexDouble = new RegExp(`\\{\\{\\s*${escapedKey}\\s*\\}\\}`, 'gi');
      const regexSingle = new RegExp(`\\{\\s*${escapedKey}\\s*\\}`, 'gi');
      zpl = zpl.replace(regexDouble, val).replace(regexSingle, val);
    });

    // Fallback: if template contains legacy sample product values, map them dynamically
    if (zpl.includes('SK1252612334') || zpl.includes('SK1252612335')) {
      zpl = zpl.replace(/SK1252612334/g, product.barcode || '')
               .replace(/SK1252612335/g, product.barcode || '');
    }
    if (zpl.includes('PENDANT')) {
      zpl = zpl.replace(/PENDANT/g, product.name || '');
    }
    if (product.price && zpl.includes('^FD1500^FS')) {
      zpl = zpl.replace(/\^FD1500\^FS/g, `^FD${product.price}^FS`);
    }

    setPrintTargetProduct(product);
    setResolvedLabelTemplate(labelTemplate);
    setResolvedZpl(zpl);
    setPrintQuantity(1);
    setPreviewImage(null);
    setPreviewDimensions(null);
    setPreviewLoading(true);
    setShowPreviewModal(true);

    try {
      const { data } = await api.post('/barcode-templates/render-preview', {
        zpl,
        labelWidth: labelTemplate.labelWidth || 40,
        labelHeight: labelTemplate.labelHeight || 20,
        dpi: labelTemplate.dpi || 203,
        sampleProduct: {
          name: product.name,
          barcode: product.barcode,
          price: product.price
        }
      });

      if (data.success && data.image) {
        setPreviewImage(data.image);
        setPreviewDimensions(data.dimensions);
      } else {
        toast.error(data.message || 'Failed to render ZPL preview');
      }
    } catch (err) {
      toast.error('Failed to render barcode preview: ' + (err.response?.data?.message || err.message));
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleExecutePrint = async () => {
    const rawVal = String(printQuantity).trim();
    if (!rawVal) {
      toast.error('Please enter the number of labels to print');
      return;
    }
    if (!/^\d+$/.test(rawVal)) {
      toast.error('Please enter a valid positive whole number (no decimals or symbols)');
      return;
    }
    const qty = parseInt(rawVal, 10);
    if (qty <= 0) {
      toast.error('Number of labels must be at least 1');
      return;
    }

    const product = printTargetProduct;
    if (!product || !resolvedZpl) return;

    let finalZpl = resolvedZpl;
    if (/\^PQ\d+/i.test(finalZpl)) {
      finalZpl = finalZpl.replace(/\^PQ\d+[^\\^]*/gi, `^PQ${qty},0,0,N`);
    } else if (/\^XZ/i.test(finalZpl)) {
      finalZpl = finalZpl.replace(/\^XZ/gi, `^PQ${qty},0,0,N\n^XZ`);
    } else {
      finalZpl = `${finalZpl}\n^PQ${qty},0,0,N\n^XZ`;
    }

    setShowQuantityModal(false);
    setShowPreviewModal(false);

    try {
      const { data } = await api.post('/barcode-templates/print-zpl', {
        zpl: finalZpl,
        quantity: qty
      });

      if (data.success) {
        toast.success(data.message || `Sent ${qty} label(s) for "${product.name}" to Zebra printer.`);
      } else {
        toast.info(data.message || `Prepared ${qty} label(s) for printing.`);
      }
    } catch (err) {
      toast.error('Print request failed: ' + (err.response?.data?.message || err.message));
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (showModal) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [showModal]);

  // Filtered product types based on selected Category in modal
  const categoryProductTypes = useMemo(() => {
    if (!formData.categoryId) return [];
    return productTypes.filter(
      pt => pt.categoryId?.toString() === formData.categoryId?.toString() && pt.isActive !== false
    );
  }, [formData.categoryId, productTypes]);

  // Selected Product Type object
  const selectedProductTypeObj = useMemo(() => {
    if (!formData.productTypeId) return null;
    return productTypes.find(pt => pt.id?.toString() === formData.productTypeId?.toString()) || null;
  }, [formData.productTypeId, productTypes]);

  // Available Genders from selected product type
  const availableGenders = useMemo(() => {
    if (selectedProductTypeObj && Array.isArray(selectedProductTypeObj.genders) && selectedProductTypeObj.genders.length > 0) {
      return selectedProductTypeObj.genders;
    }
    return DEFAULT_GENDERS;
  }, [selectedProductTypeObj]);

  // Configured Attributes from selected product type
  const configuredAttributes = useMemo(() => {
    if (selectedProductTypeObj && Array.isArray(selectedProductTypeObj.attributes)) {
      return selectedProductTypeObj.attributes;
    }
    return [];
  }, [selectedProductTypeObj]);

  // Configured Sizes from selected product type
  const configuredSizes = useMemo(() => {
    if (selectedProductTypeObj && Array.isArray(selectedProductTypeObj.sizes)) {
      return selectedProductTypeObj.sizes;
    }
    return [];
  }, [selectedProductTypeObj]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setImagePreview(URL.createObjectURL(selectedFile));
    }
  };

  // Open modal for new product
  const handleAddNew = () => {
    setFormData(initialFormState);
    setFile(null);
    setImagePreview(null);
    setShowModal(true);
  };

  // Open modal to edit existing product
  const handleEdit = (product) => {
    let parsedAttributes = {};
    if (product.attributes) {
      parsedAttributes = typeof product.attributes === 'string' ? JSON.parse(product.attributes) : product.attributes;
    }

    let parsedSizeStocks = [];
    if (product.sizeStocks) {
      parsedSizeStocks = typeof product.sizeStocks === 'string' ? JSON.parse(product.sizeStocks) : product.sizeStocks;
    }

    const hasMultiSizes = Array.isArray(parsedSizeStocks) && parsedSizeStocks.length > 1;

    setFormData({
      ...product,
      id: product.id,
      name: product.name || '',
      categoryId: product.categoryId ? product.categoryId.toString() : '',
      categoryName: product.categoryName || product.category?.name || '',
      productTypeId: product.productTypeId ? product.productTypeId.toString() : '',
      productTypeName: product.productTypeName || product.productType?.name || '',
      gender: product.gender || '',
      attributes: parsedAttributes || {},
      sizeMode: hasMultiSizes ? 'multi' : 'single',
      size: product.size || '',
      sizeStocks: parsedSizeStocks || [],
      stock: product.stock !== undefined ? product.stock.toString() : '0',
      price: product.price ? product.price.toString() : '',
      costPrice: product.costPrice ? product.costPrice.toString() : '',
      taxRate: product.taxRate !== undefined ? product.taxRate.toString() : '0',
      taxPercent: product.taxPercent !== undefined ? product.taxPercent.toString() : '0',
      taxType: product.taxType || 'none',
      hsnCode: product.hsnCode || '',
      warranty: product.warranty !== null && product.warranty !== undefined ? product.warranty.toString() : '0',
      description: product.description || '',
      barcode: product.barcode || '',
      hasBarcode: product.hasBarcode !== undefined ? product.hasBarcode : true,
      minDiscount: product.minDiscount !== null && product.minDiscount !== undefined ? product.minDiscount.toString() : '',
      maxDiscount: product.maxDiscount !== null && product.maxDiscount !== undefined ? product.maxDiscount.toString() : '',
      isTaxInclusive: product.isTaxInclusive || false,
      isActive: product.isActive !== undefined ? product.isActive : true
    });
    setFile(null);
    setImagePreview(product.imageUrl || null);
    setShowModal(true);
  };

  // Handle Category change (resets dependent fields)
  const handleCategoryChange = (val) => {
    const selectedCat = categories.find(c => c.id.toString() === val.toString());
    setFormData(prev => ({
      ...prev,
      categoryId: val,
      categoryName: selectedCat ? selectedCat.name : '',
      productTypeId: '',
      productTypeName: '',
      gender: '',
      attributes: {},
      size: '',
      sizeStocks: [],
      stock: '0'
    }));
  };

  // Handle Product Type change (initializes attributes, genders, sizes)
  const handleProductTypeChange = (val) => {
    const selectedPt = productTypes.find(pt => pt.id.toString() === val.toString());
    let initialSizeStocks = [];

    if (selectedPt && Array.isArray(selectedPt.sizes) && selectedPt.sizes.length > 0) {
      initialSizeStocks = selectedPt.sizes.map(s => ({ size: s, stock: 0 }));
    }

    setFormData(prev => ({
      ...prev,
      productTypeId: val,
      productTypeName: selectedPt ? selectedPt.name : '',
      gender: selectedPt && selectedPt.genders?.length > 0 ? selectedPt.genders[0] : '',
      attributes: {},
      size: selectedPt && selectedPt.sizes?.length > 0 ? selectedPt.sizes[0] : '',
      sizeStocks: initialSizeStocks,
      stock: '0'
    }));
  };

  // Handle attribute selection
  const handleAttributeChange = (attrName, optionVal) => {
    setFormData(prev => ({
      ...prev,
      attributes: {
        ...prev.attributes,
        [attrName]: optionVal
      }
    }));
  };

  // Handle size stock change in multi-size mode
  const handleSizeStockChange = (sizeName, qty) => {
    const parsedQty = Math.max(0, parseInt(qty, 10) || 0);
    setFormData(prev => {
      const existingIdx = prev.sizeStocks.findIndex(item => item.size === sizeName);
      let updatedList = [...prev.sizeStocks];

      if (existingIdx >= 0) {
        updatedList[existingIdx] = { size: sizeName, stock: parsedQty };
      } else {
        updatedList.push({ size: sizeName, stock: parsedQty });
      }

      const totalCalculatedStock = updatedList.reduce((sum, item) => sum + (parseInt(item.stock, 10) || 0), 0);

      return {
        ...prev,
        sizeStocks: updatedList,
        stock: totalCalculatedStock.toString(),
        size: updatedList.filter(item => item.stock > 0).map(item => item.size).join(', ') || prev.size
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Product Name is required');
      return;
    }
    if (!formData.categoryId) {
      toast.error('Category is required');
      return;
    }

    // Create FormData for file upload
    const data = new FormData();

    // Append basic fields
    data.append('name', formData.name.trim());
    data.append('categoryId', formData.categoryId);
    data.append('categoryName', formData.categoryName || '');
    data.append('price', formData.price || '0');
    data.append('costPrice', formData.costPrice || '');
    data.append('taxRate', formData.taxRate || '0');
    data.append('taxPercent', formData.taxRate || '0');
    data.append('taxType', formData.taxType || 'none');
    data.append('isTaxInclusive', formData.isTaxInclusive);
    data.append('hsnCode', formData.hsnCode || '');
    data.append('warranty', formData.warranty || '0');
    data.append('minDiscount', formData.minDiscount || '');
    data.append('maxDiscount', formData.maxDiscount || '');
    data.append('barcode', formData.barcode || '');
    data.append('hasBarcode', formData.hasBarcode);
    data.append('description', formData.description || '');
    data.append('isActive', formData.isActive);

    // Append hierarchy fields
    if (formData.productTypeId) {
      data.append('productTypeId', formData.productTypeId);
      data.append('productTypeName', formData.productTypeName || '');
    }
    if (formData.gender) {
      data.append('gender', formData.gender);
    }
    if (formData.attributes && Object.keys(formData.attributes).length > 0) {
      data.append('attributes', JSON.stringify(formData.attributes));
    }
    if (formData.size) {
      data.append('size', formData.size);
    }
    if (formData.sizeStocks && formData.sizeStocks.length > 0) {
      data.append('sizeStocks', JSON.stringify(formData.sizeStocks));
    }
    data.append('stock', formData.stock || '0');

    if (file) {
      data.append('image', file);
    }

    try {
      const config = { headers: { 'Content-Type': 'multipart/form-data' } };

      if (formData.id) {
        await api.put(`/products/${formData.id}`, data, config);
        toast.success('Product updated successfully!');
      } else {
        await api.post('/products', data, config);
        toast.success('Product created successfully!');
      }

      setShowModal(false);
      fetchProducts();
      setFile(null);
      setImagePreview(null);
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.message || 'Failed to save product');
    }
  };

  // Filter Logic
  const filteredProducts = products.filter(product => {
    const matchesCategory = filterCategory === '' ||
      (typeof product.category === 'string'
        ? product.category.toLowerCase().includes(filterCategory.toLowerCase())
        : (product.category?.name?.toLowerCase() || '').includes(filterCategory.toLowerCase()) ||
        product.categoryName?.toLowerCase().includes(filterCategory.toLowerCase()));

    const matchesProductType = filterProductType === '' ||
      (product.productType?.name?.toLowerCase() || '').includes(filterProductType.toLowerCase()) ||
      (product.productTypeName?.toLowerCase() || '').includes(filterProductType.toLowerCase());

    let matchesStock = true;
    if (filterStock === 'low') matchesStock = product.stock > 0 && product.stock <= product.minStockLevel;
    if (filterStock === 'out') matchesStock = product.stock === 0;

    const matchesSearch = searchTerm === '' ||
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.barcode || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.productTypeName || product.productType?.name || '').toLowerCase().includes(searchTerm.toLowerCase());

    return matchesCategory && matchesProductType && matchesStock && matchesSearch;
  });

  const uniqueCategories = [...new Set(products.map(p => p.category?.name || p.categoryName).filter(Boolean))];
  const uniqueProductTypes = [...new Set(products.map(p => p.productType?.name || p.productTypeName).filter(Boolean))];

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Products</h1>
          <p className="text-slate-500 text-sm mt-1">Manage your inventory, category hierarchy, size variants and stock levels</p>
        </div>
        <button className="btn btn-primary w-full md:w-auto shadow-lg shadow-primary/20" onClick={handleAddNew}>
          <FiPlus className="text-lg" /> Add New Product
        </button>
      </div>

      {/* Search & Filters */}
      <div className="card mb-6 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-xl border border-slate-200">
            <FiSearch className="text-slate-400" />
            <input
              type="text"
              placeholder="Search product, barcode..."
              className="bg-transparent text-sm focus:outline-none text-slate-700 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div>
            <SearchableSelect
              options={[{ label: 'All Categories', value: '' }, ...uniqueCategories.map(cat => ({ label: cat, value: cat }))]}
              value={filterCategory}
              onChange={setFilterCategory}
              placeholder="Filter by Category..."
            />
          </div>

          <div>
            <SearchableSelect
              options={[{ label: 'All Product Types', value: '' }, ...uniqueProductTypes.map(pt => ({ label: pt, value: pt }))]}
              value={filterProductType}
              onChange={setFilterProductType}
              placeholder="Filter by Product Type..."
            />
          </div>

          <div>
            <SearchableSelect
              options={[
                { label: 'All Stock Status', value: 'all' },
                { label: 'Low Stock', value: 'low' },
                { label: 'Out of Stock', value: 'out' }
              ]}
              value={filterStock}
              onChange={setFilterStock}
              placeholder="Stock Status..."
            />
          </div>
        </div>
      </div>

      {/* Product List Table */}
      <div className="card border-0 shadow-lg overflow-hidden">
        <div className="table-container lg:no-scrollbar overflow-x-auto">
          <table className="table-modern">
            <thead>
              <tr className="whitespace-nowrap">
                <th>Product Name</th>
                <th>Category</th>
                <th>Product Type</th>
                <th>Gender</th>
                <th>Size</th>
                <th>Selling Price</th>
                <th>Stock</th>
                <th>Stock Status</th>
                <th>Barcode</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="11" className="text-center py-8 text-slate-400">Loading products...</td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan="11" className="text-center py-8 text-slate-400">No products found.</td>
                </tr>
              ) : (
                filteredProducts.map((product) => {
                  let parsedSizeStocks = [];
                  if (product.sizeStocks) {
                    parsedSizeStocks = typeof product.sizeStocks === 'string' ? JSON.parse(product.sizeStocks) : product.sizeStocks;
                  }
                  const hasMultiSizes = Array.isArray(parsedSizeStocks) && parsedSizeStocks.length > 0;

                  return (
                    <tr key={product.id} className="whitespace-nowrap hover:bg-slate-50/80 transition-colors">
                      {/* Product Name & Image */}
                      <td className="font-semibold text-slate-800">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 overflow-hidden border border-slate-200 shrink-0">
                            {product.imageUrl ? (
                              <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                            ) : (
                              <FiBox className="text-lg" />
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-slate-800">{product.name}</div>
                            {product.attributes && typeof product.attributes === 'object' && Object.keys(product.attributes).length > 0 && (
                              <div className="text-[10px] text-slate-400 font-normal">
                                {Object.entries(product.attributes).slice(0, 3).map(([k, v]) => `${k}: ${v}`).join(' • ')}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td>
                        <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded-md text-xs font-medium border border-slate-200">
                          {product.category?.name || product.categoryName || 'Uncategorized'}
                        </span>
                      </td>

                      {/* Product Type */}
                      <td>
                        {product.productType?.name || product.productTypeName ? (
                          <span className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded-md text-xs font-semibold border border-indigo-100">
                            {product.productType?.name || product.productTypeName}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">-</span>
                        )}
                      </td>

                      {/* Gender / Group */}
                      <td>
                        {product.gender ? (
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md text-[11px] font-medium border border-blue-100">
                            {product.gender}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">-</span>
                        )}
                      </td>

                      {/* Size */}
                      <td>
                        {hasMultiSizes ? (
                          <div className="flex flex-wrap gap-1 max-w-[150px]">
                            {parsedSizeStocks.filter(s => s.stock > 0).map((s, idx) => (
                              <span key={idx} className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded text-[10px] font-semibold border border-emerald-100" title={`${s.size}: ${s.stock} units`}>
                                {s.size}
                              </span>
                            ))}
                            {parsedSizeStocks.filter(s => s.stock > 0).length === 0 && (
                              <span className="text-xs text-slate-400">{product.size || '-'}</span>
                            )}
                          </div>
                        ) : product.size ? (
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md text-[11px] font-bold border border-emerald-100">
                            {product.size}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">-</span>
                        )}
                      </td>

                      {/* Selling Price */}
                      <td className="p-4 text-slate-900 font-semibold">
                        {companyProfile?.currencySymbol || '₹'}{Number(product.price).toFixed(2)}
                      </td>

                      {/* Stock */}
                      <td>
                        {hasMultiSizes ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="font-semibold text-xs text-slate-800">
                              {product.stock} units
                            </span>
                            <div className="text-[10px] text-slate-500">
                              {parsedSizeStocks.map(s => `${s.size}:${s.stock}`).join(' | ')}
                            </div>
                          </div>
                        ) : (
                          <span className="font-semibold text-xs text-slate-800">
                            {product.stock} units
                          </span>
                        )}
                      </td>

                      {/* Stock Status */}
                      <td>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${product.stock === 0 ? 'bg-red-50 text-red-600 border border-red-200' : product.stock <= product.minStockLevel ? 'bg-amber-50 text-amber-600 border border-amber-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
                          {product.stock === 0 ? 'Out of Stock' : product.stock <= product.minStockLevel ? 'Low Stock' : 'In Stock'}
                        </span>
                      </td>

                      {/* Barcode */}
                      <td className="font-mono text-xs text-slate-500">{product.barcode}</td>

                      {/* Status */}
                      <td>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${product.isActive ? 'bg-green-50 text-green-600 border border-green-200' : 'bg-slate-100 text-slate-400 border border-slate-200'}`}>
                          {product.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="text-right">
                        <div className="flex justify-end items-center gap-2">
                          <button
                            onClick={() => handleOpenPrintModal(product)}
                            className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-primary transition-colors"
                            title="Print Barcode"
                          >
                            <FiPrinter />
                          </button>
                          <button
                            onClick={() => handleEdit(product)}
                            className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
                            title="Edit Product"
                          >
                            <FiEdit />
                          </button>
                          {(localStorage.getItem('user') && JSON.parse(localStorage.getItem('user')).role === 'admin') && (
                            <button
                              onClick={() => {
                                setStatusTarget(product);
                                setShowStatusModal(true);
                              }}
                              className="relative flex items-center cursor-pointer focus:outline-none group"
                              title={product.isActive ? 'Deactivate Product' : 'Activate Product'}
                            >
                              <div className={`w-9 h-5 rounded-full transition-colors duration-300 ${product.isActive ? 'bg-primary shadow-inner' : 'bg-slate-200'}`}></div>
                              <div className={`absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition-transform duration-300 transform ${product.isActive ? 'translate-x-4' : 'translate-x-0'} shadow-md`}></div>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[50000] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 sm:p-6 overflow-hidden">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[calc(100vh-48px)] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-2xl shrink-0">
              <div>
                <h2 className="text-xl font-bold text-slate-800">{formData.id ? 'Edit Product' : 'Add New Product'}</h2>
                <p className="text-xs text-slate-500 mt-0.5">Define product hierarchy: Category &rarr; Product Type &rarr; Gender &rarr; Attributes &rarr; Size & Stock</p>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 text-2xl font-bold leading-none p-1 rounded-lg hover:bg-slate-100 transition-colors"
                title="Close"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              {/* Scrollable Form Content */}
              <div className="p-6 overflow-y-auto flex-1 min-h-0 space-y-6">
                {/* Product Image & Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80">
                  <div className="flex flex-col items-center justify-center">
                    <div className="w-24 h-24 bg-white rounded-2xl flex items-center justify-center text-slate-400 mb-2 overflow-hidden border-2 border-slate-200 shadow-sm">
                      {imagePreview ? (
                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <FiBox className="text-3xl" />
                      )}
                    </div>
                    <label className="btn btn-secondary text-xs cursor-pointer px-3 py-1.5">
                      Upload Image
                      <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                    </label>
                  </div>

                  <div className="md:col-span-2 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Product Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        required
                        className="input w-full"
                        placeholder="e.g. Cotton Slim Fit T-Shirt"
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Category <span className="text-red-500">*</span>
                      </label>
                      <SearchableSelect
                        options={(categories || []).map(cat => ({ label: cat.name, value: cat.id }))}
                        value={formData.categoryId}
                        onChange={handleCategoryChange}
                        placeholder="Select Category..."
                        zIndex={100005}
                      />
                    </div>
                  </div>
                </div>

                {/* HIERARCHY SECTION */}
                <div className="border border-indigo-100 bg-indigo-50/30 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center gap-2 text-indigo-950 font-bold text-sm">
                    <FiLayers className="text-primary" /> Product Hierarchy & Classification
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Step 2: Product Type (Category Dependent) */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Product Type {formData.categoryId && <span className="text-primary font-normal">(Filtered for Category)</span>}
                      </label>
                      {formData.categoryId ? (
                        (categoryProductTypes || []).length > 0 ? (
                          <SearchableSelect
                            options={(categoryProductTypes || []).map(pt => ({ label: pt.name, value: pt.id }))}
                            value={formData.productTypeId}
                            onChange={handleProductTypeChange}
                            placeholder="Select Product Type..."
                            zIndex={100005}
                          />
                        ) : (
                          <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
                            <FiInfo className="shrink-0" />
                            <span>No product types configured for this category. (Configure in Product Type Master)</span>
                          </div>
                        )
                      ) : (
                        <div className="input text-xs text-slate-400 bg-slate-100 flex items-center">
                          Select Category first
                        </div>
                      )}
                    </div>

                    {/* Step 3: Gender / Group */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Gender / Group</label>
                      <select
                        className="input w-full text-xs"
                        value={formData.gender}
                        onChange={e => setFormData({ ...formData, gender: e.target.value })}
                        disabled={!formData.productTypeId}
                      >
                        <option value="">Select Gender / Group</option>
                        {availableGenders.map(g => (
                          <option key={g} value={g}>{g}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Step 4: Dynamic Product Attributes */}
                  {configuredAttributes.length > 0 && (
                    <div className="pt-2 border-t border-indigo-100/80">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                        Product Attributes ({configuredAttributes.length} configured)
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {configuredAttributes.map((attr, idx) => (
                          <div key={idx} className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                              {attr.name}
                            </label>
                            <select
                              className="input w-full !py-1 text-xs"
                              value={formData.attributes[attr.name] || ''}
                              onChange={e => handleAttributeChange(attr.name, e.target.value)}
                            >
                              <option value="">Select {attr.name}...</option>
                              {(attr.options || []).map((opt, oIdx) => (
                                <option key={oIdx} value={opt}>{opt}</option>
                              ))}
                            </select>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* SIZE & STOCK MANAGEMENT SECTION */}
                <div className="border border-emerald-100 bg-emerald-50/30 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center gap-2 text-emerald-950 font-bold text-sm">
                    <FiTag className="text-emerald-600" /> Size & Stock Configuration
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Select Size / Variant</label>
                      {configuredSizes.length > 0 ? (
                        <select
                          className="input w-full text-xs"
                          value={formData.size}
                          onChange={e => setFormData({ ...formData, size: e.target.value })}
                        >
                          <option value="">Select Size</option>
                          {configuredSizes.map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          className="input w-full text-xs"
                          placeholder="e.g. M, L, XL, 32"
                          value={formData.size}
                          onChange={e => setFormData({ ...formData, size: e.target.value })}
                        />
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Opening Stock Quantity</label>
                      <input
                        type="number"
                        min="0"
                        className="input w-full text-xs font-bold text-slate-800"
                        placeholder="0"
                        value={formData.stock}
                        onChange={e => setFormData({ ...formData, stock: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* PRICING & TAX SECTION */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Selling Price (₹) <span className="text-red-500">*</span>
                    </label>
                    <input
                      required
                      type="number"
                      step="0.01"
                      className="input w-full font-bold text-slate-900"
                      placeholder="0.00"
                      value={formData.price}
                      onChange={e => setFormData({ ...formData, price: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Tax Rate (%)</label>
                    <input
                      type="number"
                      className="input w-full"
                      value={formData.taxRate}
                      onChange={e => {
                        const val = e.target.value;
                        setFormData({ ...formData, taxRate: val, taxPercent: val });
                      }}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Tax Type</label>
                    <select
                      className="input w-full"
                      value={formData.taxType}
                      onChange={e => setFormData({ ...formData, taxType: e.target.value })}
                    >
                      <option value="none">None</option>
                      <option value="igst">IGST (Inter-state)</option>
                      <option value="cgst_sgst">CGST + SGST (Intra-state)</option>
                    </select>
                  </div>
                </div>

                {/* TAX INCLUSIVE TOGGLE */}
                <div className="flex items-center gap-2">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={formData.isTaxInclusive}
                      onChange={e => setFormData({ ...formData, isTaxInclusive: e.target.checked })}
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all after:shadow-sm peer-checked:bg-primary"></div>
                    <span className="ml-3 text-sm font-medium text-slate-700">Selling Price Includes Tax</span>
                  </label>
                </div>

                {/* HSN, WARRANTY, DISCOUNTS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">HSN Code</label>
                    <input
                      className="input w-full text-xs"
                      placeholder="XXXX"
                      value={formData.hsnCode}
                      onChange={e => setFormData({ ...formData, hsnCode: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Warranty (Months)</label>
                    <input
                      type="number"
                      className="input w-full text-xs"
                      placeholder="0"
                      value={formData.warranty}
                      onChange={e => setFormData({ ...formData, warranty: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Min Discount (%)</label>
                    <input
                      type="number"
                      className="input w-full text-xs"
                      placeholder="0"
                      value={formData.minDiscount}
                      onChange={e => setFormData({ ...formData, minDiscount: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Max Discount (%)</label>
                    <input
                      type="number"
                      className="input w-full text-xs"
                      placeholder="0"
                      value={formData.maxDiscount}
                      onChange={e => setFormData({ ...formData, maxDiscount: e.target.value })}
                    />
                  </div>
                </div>

                {/* BARCODE & DESCRIPTION */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Barcode (Auto-generated if left empty)</label>
                    <div className="flex gap-2">
                      <input
                        className="input flex-1"
                        placeholder="Scan or enter code"
                        value={formData.barcode}
                        onChange={e => setFormData({ ...formData, barcode: e.target.value })}
                      />
                      <button
                        type="button"
                        className="btn btn-secondary text-xs"
                        onClick={() => setFormData({ ...formData, barcode: 'BC' + Date.now().toString().slice(-8) })}
                      >
                        Generate
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                    <textarea
                      className="input w-full"
                      rows="2"
                      placeholder="Product details, fabric specifications, washing instructions..."
                      value={formData.description}
                      onChange={e => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>
                </div>

                {/* Barcode Preview */}
                {formData.barcode && (
                  <div className="flex justify-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <Barcode value={formData.barcode} height={35} background="#f8fafc" />
                  </div>
                )}

                {/* Status Toggle */}
                <div className="pt-2 border-t border-slate-100">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={formData.isActive}
                      onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all after:shadow-sm peer-checked:bg-primary"></div>
                    <span className="ml-3 text-sm font-medium text-slate-700">Product is Active</span>
                  </label>
                </div>

              </div>

              {/* Modal Footer (Sticky / Fixed at Bottom) */}
              <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-100 flex justify-end gap-3 rounded-b-2xl shrink-0">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary shadow-lg shadow-primary/20"
                >
                  {formData.id ? 'Update Product' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Status Confirmation Modal */}
      {showStatusModal && statusTarget && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all animate-in fade-in zoom-in duration-200">
            <div className={`p-6 ${statusTarget.isActive ? 'bg-amber-50' : 'bg-green-50'}`}>
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${statusTarget.isActive ? 'bg-amber-100 text-amber-600' : 'bg-green-100 text-green-600'}`}>
                  {statusTarget.isActive ? <FiToggleRight className="w-6 h-6" /> : <FiToggleLeft className="w-6 h-6" />}
                </div>
                <div>
                  <h3 className="text-lg font-medium text-slate-900">
                    {statusTarget.isActive ? 'Deactivate Product?' : 'Activate Product?'}
                  </h3>
                  <p className="text-sm text-slate-600 mt-1">
                    {statusTarget.name}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <p className="text-slate-600 text-sm leading-relaxed">
                {statusTarget.isActive
                  ? 'This product will be hidden from the POS and Sales pages. You can reactivate it anytime from the Products or Master section.'
                  : 'This product will be visible again on the POS and Sales pages.'}
              </p>

              <div className="flex gap-3 mt-8">
                <button
                  onClick={() => setShowStatusModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium text-sm hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    try {
                      await api.put(`/products/${statusTarget.id}`, { isActive: !statusTarget.isActive });
                      toast.success(`Product ${statusTarget.isActive ? 'deactivated' : 'activated'} successfully`);
                      setShowStatusModal(false);
                      fetchProducts();
                    } catch (err) {
                      toast.error('Failed to update status');
                    }
                  }}
                  className={`flex-1 px-4 py-2.5 rounded-xl font-medium text-sm text-white shadow-lg transition-all active:scale-95 ${statusTarget.isActive ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-200' : 'bg-green-500 hover:bg-green-600 shadow-green-200'}`}
                >
                  Yes, {statusTarget.isActive ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Barcode Label Design Preview Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[115] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-150 border border-slate-100 flex flex-col">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-800">Label Preview</h3>
                  {resolvedLabelTemplate && (
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-xs font-semibold">
                      {resolvedLabelTemplate.name}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {printTargetProduct?.name} • <span className="font-mono">{printTargetProduct?.barcode}</span> • ₹{printTargetProduct?.price}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
              >
                <FiX size={18} />
              </button>
            </div>

            {/* Modal Body: Rendered Label Graphic */}
            <div className="p-6 bg-slate-100/70 flex flex-col items-center justify-center min-h-[220px]">
              {previewLoading ? (
                <div className="flex flex-col items-center gap-2 py-8 text-slate-400 text-xs">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent animate-spin rounded-full" />
                  <span>Rendering Labelary Preview...</span>
                </div>
              ) : previewImage ? (
                <div className="flex flex-col items-center">
                  <div className="bg-white p-3 rounded-xl shadow-md border border-slate-200 max-w-full flex items-center justify-center overflow-hidden">
                    <img
                      src={previewImage}
                      alt="ZPL Label Preview"
                      className="max-h-[180px] max-w-full object-contain filter drop-shadow-xs"
                      style={{ imageRendering: 'pixelated' }}
                    />
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-500 font-medium">
                    <span>{resolvedLabelTemplate?.labelWidth || 40}×{resolvedLabelTemplate?.labelHeight || 20}mm</span>
                    <span>•</span>
                    <span>{resolvedLabelTemplate?.dpi || 203} DPI</span>
                    {previewDimensions && (
                      <>
                        <span>•</span>
                        <span className="font-mono text-[10px] text-slate-400">^PW{previewDimensions.calculatedPw} ^LL{previewDimensions.calculatedLl}</span>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400">Preview not available</p>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-white border-t border-slate-100 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-slate-50 transition-colors"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setPrintQuantity(1);
                  setShowQuantityModal(true);
                }}
                disabled={previewLoading || !previewImage}
                className="px-5 py-2 rounded-xl bg-primary text-white font-semibold text-xs hover:bg-primary-dark shadow-md shadow-primary/20 transition-all active:scale-95 flex items-center gap-1.5"
              >
                <FiPrinter size={14} /> Print
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print Quantity Modal */}
      {showQuantityModal && printTargetProduct && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[125] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-150 border border-slate-100">
            <div className="p-5 border-b border-slate-100 bg-slate-50/80">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-800">Print Labels</h3>
                <span className="text-xs font-mono bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-100 font-semibold">
                  {printTargetProduct.barcode}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 truncate">
                {printTargetProduct.name} • Template: {resolvedLabelTemplate?.name || 'Selected Design'}
              </p>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Number of Labels to Print
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  autoFocus
                  required
                  className="input w-full text-center text-lg font-bold text-slate-800"
                  value={printQuantity}
                  onChange={e => setPrintQuantity(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleExecutePrint();
                    }
                  }}
                />
                <p className="text-[11px] text-slate-400 mt-1 text-center">
                  Controls the exact number of physical labels printed
                </p>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowQuantityModal(false)}
                  className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecutePrint}
                  className="flex-1 px-4 py-2 rounded-xl bg-primary text-white font-semibold text-xs hover:bg-primary-dark shadow-md shadow-primary/20 transition-all active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <FiPrinter size={14} /> Print
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
