(function () {
  function mergeConfig(base, override) {
    const result = {...(base || {})};
    for (const k of Object.keys(override || {})) {
      const v = override[k];
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        result[k] = mergeConfig(base?.[k] || {}, v);
      } else {
        result[k] = v;
      }
    }
    return result;
  }

  function sanitizeName(name) {
    return (name || '')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[\\/:*?"<>|]/g, '_')
      .replace(/\s+/g, '-')
      .toLowerCase();
  }

  async function fileToArrayBuffer(file) {
    if (file.arrayBuffer) return file.arrayBuffer();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }

  function dataUrlToBlob(dataUrl) {
    const parts = (dataUrl || '').split(',');
    if (parts.length < 2) throw new Error('Dữ liệu ảnh không hợp lệ.');
    const mime = (parts[0].match(/data:(.*?);/) || [])[1] || 'application/octet-stream';
    const binary = atob(parts[1]);
    const u8 = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) u8[i] = binary.charCodeAt(i);
    return new Blob([u8], {type: mime});
  }

  const LOCALE_TEXT = {
    en: {
      fileLabel: 'file', fileLabelPlural: 'files',
      imageLabel: 'image', imageLabelPlural: 'images',
      status: {
        chooseSupported: 'Please choose supported file types.',
        listCleared: 'File list cleared.',
        fileRemoved: 'Removed the file from the list.',
        loadingPreviews: 'Loading files and generating previews…',
        couldNotProcessFile: 'Could not process file {name}.',
        filesReady: 'Files are ready, click "{action}".',
        missingPdfReader: 'Cannot add PDF because the PDF reader library is missing.',
        unsupportedFormat: 'Could not add {detail} because the format is unsupported.',
        skippedPdf: 'Skipped {count} PDF file(s) because the reader is missing.',
        skippedUnsupported: 'Skipped {count} unsupported file(s).',
        noValidFiles: 'No valid files were added.',
        saveCanceled: 'Save canceled. No files were downloaded.',
        conversionError: 'An error occurred during conversion. Please try again.',
        missingPdfGenerator: 'Missing PDF generator library. Please include jsPDF or choose an image format.',
        missingZipLibrary: 'Missing ZIP/download library. Please ensure JSZip and FileSaver are loaded.'
      },
      qualityMessages: {
        normal: 'Normal mode (150 DPI) balances quality and size.',
        high: 'High mode (220 DPI) is clearer but produces larger files.',
        ultra: 'Ultra mode (600 DPI) takes longer; use it only when needed.'
      },
      longTaskMessages: {
        normal: { after15: 'Processing large files, please wait a bit longer.', after45: 'If it takes too long, split files or choose lower quality.' },
        high: { after15: 'Processing at high quality may take longer.', after45: 'Please wait more or choose lower quality for faster export.' },
        ultra: { after15: 'Processing in ultra mode, please keep waiting.', after45: 'Ultra mode needs more time; consider lower quality if needed.' }
      }
    },
    ar: {
      fileLabel: 'ملف', fileLabelPlural: 'ملفات',
      imageLabel: 'صورة', imageLabelPlural: 'صور',
      status: {
        chooseSupported: 'يرجى اختيار أنواع الملفات المدعومة.',
        listCleared: 'تم مسح قائمة الملفات.',
        fileRemoved: 'تمت إزالة الملف من القائمة.',
        loadingPreviews: 'جارٍ تحميل الملفات وإنشاء المعاينات…',
        couldNotProcessFile: 'تعذّر معالجة الملف {name}.',
        filesReady: 'الملفات جاهزة، انقر على "{action}".',
        missingPdfReader: 'لا يمكن إضافة PDF لأن مكتبة قراءة PDF غير متوفرة.',
        unsupportedFormat: 'تعذّر إضافة {detail} لأن التنسيق غير مدعوم.',
        skippedPdf: 'تم تجاوز {count} ملف PDF لأن قارئ PDF مفقود.',
        skippedUnsupported: 'تم تجاوز {count} ملف غير مدعوم.',
        noValidFiles: 'لم تتم إضافة أي ملفات صالحة.',
        saveCanceled: 'تم إلغاء الحفظ. لم يتم تنزيل أي ملفات.',
        conversionError: 'حدث خطأ أثناء التحويل. يُرجى المحاولة مرة أخرى.',
        missingPdfGenerator: 'مكتبة إنشاء PDF مفقودة؛ يرجى تضمين jsPDF أو اختيار تنسيق صورة.',
        missingZipLibrary: 'مكتبة ZIP/تنزيل مفقودة؛ يرجى التأكد من تحميل JSZip و FileSaver.'
      },
      qualityMessages: {
        normal: 'الوضع العادي (150 DPI) يوازن بين الجودة والحجم.',
        high: 'الوضع العالي (220 DPI) أوضح لكن ما ينتج ملفات أكبر.',
        ultra: 'الوضع الفائق (600 DPI) يستغرق وقتًا أطول؛ استخدمه عند الحاجة.'
      },
      longTaskMessages: {
        normal: { after15: 'جارٍ معالجة ملفات كبيرة، يرجى الانتظار قليلًا.', after45: 'إذا طال الوقت، قسم الملفات أو اختر جودة أقل.' },
        high: { after15: 'المعالجة بالجودة العالية قد تستغرق وقتًا أطول.', after45: 'يرجى الانتظار أكثر أو اختيار جودة أقل لتصدير أسرع.' },
        ultra: { after15: 'الوضع الفائق يعمل، يرجى الاستمرار في الانتظار.', after45: 'الوضع الفائق يحتاج وقتًا أكبر؛ فكر في تعديل الجودة إذا لم يكن ضروريًا.' }
      }
    },
    bn: {
      fileLabel: 'ফাইল', fileLabelPlural: 'ফাইল',
      imageLabel: 'ছবি', imageLabelPlural: 'ছবিগুলি',
      status: {
        chooseSupported: 'সমর্থিত ফাইল ধরনগুলি অনুগ্রহ করে নির্বাচন করুন।',
        listCleared: 'ফাইল তালিকা মুছে ফেলা হয়েছে।',
        fileRemoved: 'ফাইলটি তালিকা থেকে সরানো হয়েছে।',
        loadingPreviews: 'ফাইল লোড হচ্ছে এবং প্রিভিউ তৈরি করা হচ্ছে…',
        couldNotProcessFile: '{name} ফাইলটি প্রক্রিয়া করা যায়নি।',
        filesReady: 'ফাইলগুলি প্রস্তুত, "{action}" চাপুন।',
        missingPdfReader: 'PDF ফাইল যোগ করা যাবে না কারণ PDF রিডার লাইব্রেরি অনুপস্থিত।',
        unsupportedFormat: '{detail} যোগ করা যায়নি কারণ ফর্ম্যাটটি সমর্থিত নয়।',
        skippedPdf: '{count}টি PDF ফাইল বাদ দেওয়া হয়েছে কারণ PDF রিডার নেই।',
        skippedUnsupported: '{count}টি অসমর্থিত ফাইল বাদ দেওয়া হয়েছে।',
        noValidFiles: 'কোনো বৈধ ফাইল যোগ হয়নি।',
        saveCanceled: 'সংরক্ষণ বাতিল করা হয়েছে। কোনো ফাইল ডাউনলোড হয়নি।',
        conversionError: 'রূপান্তরে একটি ত্রুটি হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।',
        missingPdfGenerator: 'PDF তৈরি লাইব্রেরি অনুপস্থিত; jsPDF যুক্ত করুন অথবা একটি ইমেজ ফরম্যাট নির্বাচন করুন।',
        missingZipLibrary: 'ZIP/ডাউনলোড লাইব্রেরি অনুপস্থিত; JSZip ও FileSaver লোড আছে কি দেখুন।'
      },
      qualityMessages: {
        normal: 'নিয়মিত মোড (150 DPI) গুণমান ও সাইজের মধ্যে ভারসাম্য রাখে।',
        high: 'উচ্চ মান (220 DPI) আরও পরিষ্কার, তবে ফাইল বড় হয়।',
        ultra: 'উল্টিমেট মোড (600 DPI) সময় নেয়; প্রয়োজন হলে ব্যবহার করুন।'
      },
      longTaskMessages: {
        normal: { after15: 'বড় ফাইল প্রক্রিয়াকরণ হচ্ছে, একটু অপেক্ষা করুন।', after45: 'যদি সময় বেশি নেয়, ফাইল ভাগ করুন বা কম মান নির্বাচন করুন।' },
        high: { after15: 'উচ্চ গুণমান প্রক্রিয়াতে বেশি সময় লাগতে পারে।', after45: 'আরও অপেক্ষা করুন অথবা দ্রুত রপ্তানির জন্য নিম্ন মান বাছুন।' },
        ultra: { after15: 'উচ্চমান মোড চলছে, দয়া করে ধৈর্য ধরুন।', after45: 'এই মোডে আরও সময় লাগে; প্রয়োজনে কম মান বেছে নিন।' }
      }
    },
    de: {
      fileLabel: 'Datei', fileLabelPlural: 'Dateien',
      imageLabel: 'Bild', imageLabelPlural: 'Bilder',
      status: {
        chooseSupported: 'Bitte wählen Sie unterstützte Dateitypen aus.',
        listCleared: 'Dateiliste wurde gelöscht.',
        fileRemoved: 'Die Datei wurde aus der Liste entfernt.',
        loadingPreviews: 'Lade Dateien und erstelle Vorschauen…',
        couldNotProcessFile: 'Datei {name} konnte nicht verarbeitet werden.',
        filesReady: 'Die Dateien sind bereit, klicken Sie auf "{action}".',
        missingPdfReader: 'PDF kann nicht hinzugefügt werden, weil die PDF-Bibliothek fehlt.',
        unsupportedFormat: '{detail} konnte nicht hinzugefügt werden, weil das Format nicht unterstützt wird.',
        skippedPdf: '{count} PDF-Datei(en) wurden überschritten, da der PDF-Reader fehlt.',
        skippedUnsupported: '{count} nicht unterstützte Datei(en) wurden übersprungen.',
        noValidFiles: 'Es wurden keine gültigen Dateien hinzugefügt.',
        saveCanceled: 'Speichern abgebrochen. Es wurden keine Dateien heruntergeladen.',
        conversionError: 'Bei der Konvertierung ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut.',
        missingPdfGenerator: 'PDF-Erzeugungsbibliothek fehlt. Bitte jsPDF einbinden oder ein Bildformat wählen.',
        missingZipLibrary: 'ZIP-/Download-Bibliothek fehlt. Bitte stellen Sie sicher, dass JSZip und FileSaver geladen sind.'
      },
      qualityMessages: {
        normal: 'Normalmodus (150 DPI) balanciert Qualität und Größe.',
        high: 'Hochmodus (220 DPI) ist klarer, erzeugt aber größere Dateien.',
        ultra: 'Ultra-Modus (600 DPI) dauert länger; nur bei Bedarf verwenden.'
      },
      longTaskMessages: {
        normal: { after15: 'Verarbeite große Dateien, bitte etwas warten.', after45: 'Wenn es zu lange dauert, Datei teilen oder niedrigere Qualität wählen.' },
        high: { after15: 'Die Verarbeitung in hoher Qualität kann länger dauern.', after45: 'Bitte noch etwas warten oder für schnelleren Export niedrigere Qualität wählen.' },
        ultra: { after15: 'Ultra-Modus läuft, bitte Geduld.', after45: 'Ultra-Modus braucht mehr Zeit; erwäge eine niedrigere Qualität.' }
      }
    },
    es: {
      fileLabel: 'archivo', fileLabelPlural: 'archivos',
      imageLabel: 'imagen', imageLabelPlural: 'imágenes',
      status: {
        chooseSupported: 'Seleccione tipos de archivo compatibles.',
        listCleared: 'Lista de archivos borrada.',
        fileRemoved: 'El archivo se ha eliminado de la lista.',
        loadingPreviews: 'Cargando archivos y generando vistas previas…',
        couldNotProcessFile: 'No se pudo procesar el archivo {name}.',
        filesReady: 'Los archivos están listos, haz clic en "{action}".',
        missingPdfReader: 'No se puede agregar PDF porque falta la biblioteca del lector de PDF.',
        unsupportedFormat: 'No se pudo agregar {detail} porque el formato no es compatible.',
        skippedPdf: 'Se omitieron {count} archivos PDF porque falta el lector.',
        skippedUnsupported: 'Se omitieron {count} archivos no compatibles.',
        noValidFiles: 'No se agregaron archivos válidos.',
        saveCanceled: 'Descarga cancelada. No se descargaron archivos.',
        conversionError: 'Ocurrió un error durante la conversión. Intenta de nuevo.',
        missingPdfGenerator: 'Falta la biblioteca generadora de PDF. Incluye jsPDF o elige un formato de imagen.',
        missingZipLibrary: 'Falta la biblioteca ZIP/descarga. Asegúrate de cargar JSZip y FileSaver.'
      },
      qualityMessages: {
        normal: 'El modo normal (150 DPI) equilibra calidad y tamaño.',
        high: 'El modo alto (220 DPI) es más claro pero genera archivos más grandes.',
        ultra: 'El modo ultra (600 DPI) tarda más; úsalo solo cuando necesites.'
      },
      longTaskMessages: {
        normal: { after15: 'Procesando archivos grandes, espera un momento.', after45: 'Si tarda demasiado, divide los archivos o elige menor calidad.' },
        high: { after15: 'Procesar con alta calidad puede llevar más tiempo.', after45: 'Espera un poco o selecciona calidad inferior para exportar más rápido.' },
        ultra: { after15: 'El modo ultra está en proceso, mantén la espera.', after45: 'El modo ultra necesita más tiempo; considera bajar la calidad si no es necesario.' }
      }
    },
    fr: {
      fileLabel: 'fichier', fileLabelPlural: 'fichiers',
      imageLabel: 'image', imageLabelPlural: 'images',
      status: {
        chooseSupported: 'Veuillez choisir des types de fichiers pris en charge.',
        listCleared: 'Liste de fichiers effacée.',
        fileRemoved: 'Le fichier a été retiré de la liste.',
        loadingPreviews: 'Chargement des fichiers et génération des aperçus…',
        couldNotProcessFile: 'Impossible de traiter le fichier {name}.',
        filesReady: 'Les fichiers sont prêts, cliquez sur « {action} ».',
        missingPdfReader: 'Impossible d’ajouter le PDF car la bibliothèque de lecture PDF est manquante.',
        unsupportedFormat: 'Impossible d’ajouter {detail} car le format n’est pas pris en charge.',
        skippedPdf: '{count} fichier(s) PDF ignoré(s) car le lecteur est manquant.',
        skippedUnsupported: '{count} fichier(s) non pris en charge ignoré(s).',
        noValidFiles: 'Aucun fichier valide n’a été ajouté.',
        saveCanceled: 'Enregistrement annulé. Aucun fichier n’a été téléchargé.',
        conversionError: 'Une erreur est survenue pendant la conversion. Veuillez réessayer.',
        missingPdfGenerator: 'Bibliothèque de génération PDF manquante ; ajoutez jsPDF ou choisissez un format image.',
        missingZipLibrary: 'Bibliothèque ZIP/téléchargement manquante ; veuillez charger JSZip et FileSaver.'
      },
      qualityMessages: {
        normal: 'Le mode normal (150 DPI) équilibre qualité et taille.',
        high: 'Le mode haute qualité (220 DPI) est plus net mais produit des fichiers plus volumineux.',
        ultra: 'Le mode ultra (600 DPI) prend plus de temps ; utilisez-le uniquement si nécessaire.'
      },
      longTaskMessages: {
        normal: { after15: 'Traitement de gros fichiers, veuillez patienter un instant.', after45: 'Si cela prend trop longtemps, séparez les fichiers ou choisissez une qualité inférieure.' },
        high: { after15: 'Le traitement en haute qualité peut durer plus longtemps.', after45: 'Merci de patienter un peu ou de passer à une qualité inférieure pour un export plus rapide.' },
        ultra: { after15: 'Le mode ultra est en cours ; merci de rester patient.', after45: 'Ce mode demande plus de temps ; envisagez de réduire la qualité si ce n’est pas nécessaire.' }
      }
    },
    hi: {
      fileLabel: 'फ़ाइल', fileLabelPlural: 'फ़ाइलें',
      imageLabel: 'छवि', imageLabelPlural: 'छवियाँ',
      status: {
        chooseSupported: 'कृपया समर्थित फ़ाइल प्रकार चुनें।',
        listCleared: 'फ़ाइल सूची साफ़ कर दी गई।',
        fileRemoved: 'फ़ाइल सूची से हटा दी गई।',
        loadingPreviews: 'फ़ाइलें लोड हो रही हैं और पूर्वावलोकन बना रहे हैं…',
        couldNotProcessFile: 'फ़ाइल {name} को संसाधित नहीं किया जा सका।',
        filesReady: 'फ़ाइलें तैयार हैं, "{action}" क्लिक करें।',
        missingPdfReader: 'PDF जोड़ना संभव नहीं है क्योंकि PDF रीडर लाइब्रेरी मौजूद नहीं है।',
        unsupportedFormat: '{detail} नहीं जोड़ा जा सका क्योंकि फ़ॉर्मैट समर्थित नहीं है।',
        skippedPdf: '{count} PDF फ़ाइलें छोड़ दी गईं क्योंकि PDF रीडर नहीं है।',
        skippedUnsupported: '{count} असमर्थित फ़ाइलें छोड़ी गईं।',
        noValidFiles: 'कोई मान्य फ़ाइल जोड़नी नहीं हुई।',
        saveCanceled: 'सहेजना रद्द कर दिया गया। कोई फ़ाइल डाउनलोड नहीं हुई।',
        conversionError: 'कन्वर्शन के दौरान त्रुटि हुई। कृपया फिर से प्रयास करें।',
        missingPdfGenerator: 'PDF जनरेटर लाइब्रेरी गायब है; jsPDF जोड़ें या कोई इमेज फॉर्मेट चुनें।',
        missingZipLibrary: 'ZIP/डाउनलोड लाइब्रेरी गायब है; कृपया JSZip और FileSaver लोड करें।'
      },
      qualityMessages: {
        normal: 'नॉर्मल मोड (150 DPI) गुणवत्ता और आकार का संतुलन बनाता है।',
        high: 'हाई मोड (220 DPI) अधिक स्पष्टता देता है लेकिन बड़ी फ़ाइलें बनता है।',
        ultra: 'अल्ट्रा मोड (600 DPI) अधिक समय लेता है; आवश्यकता होने पर ही उपयोग करें।'
      },
      longTaskMessages: {
        normal: { after15: 'बड़ी फ़ाइलें प्रोसेस हो रही हैं, कृपया प्रतीक्षा करें।', after45: 'अगर समय ज्यादा लग रहा है तो फ़ाइलें बांटें या कम गुणवत्ता चुनें।' },
        high: { after15: 'उच्च गुणवत्ता में प्रोसेसिंग में अधिक समय लग सकता है।', after45: 'कृपया थोड़ा और इंतजार करें या तेज़ निर्यात के लिए कम गुणवत्ता चुनें।' },
        ultra: { after15: 'अल्ट्रा मोड चल रहा है, कृपया धैर्य रखें।', after45: 'अल्ट्रा मोड को अधिक समय की आवश्यकता होती है; यदि आवश्यक न हो तो गुणवत्ता घटाएँ।' }
      }
    },
    id: {
      fileLabel: 'file', fileLabelPlural: 'file',
      imageLabel: 'gambar', imageLabelPlural: 'gambar',
      status: {
        chooseSupported: 'Pilih jenis file yang didukung.',
        listCleared: 'Daftar file dibersihkan.',
        fileRemoved: 'File telah dihapus dari daftar.',
        loadingPreviews: 'Memuat file dan membuat pratinjau…',
        couldNotProcessFile: 'Tidak dapat memproses file {name}.',
        filesReady: 'File siap, klik "{action}".',
        missingPdfReader: 'Tidak dapat menambahkan PDF karena pustaka pembaca PDF tidak tersedia.',
        unsupportedFormat: 'Tidak dapat menambahkan {detail} karena format tidak didukung.',
        skippedPdf: 'Dilewati {count} file PDF karena pembaca tidak tersedia.',
        skippedUnsupported: 'Dilewati {count} file yang tidak didukung.',
        noValidFiles: 'Tidak ada file valid yang ditambahkan.',
        saveCanceled: 'Simpan dibatalkan. Tidak ada file yang diunduh.',
        conversionError: 'Terjadi kesalahan saat konversi. Silakan coba lagi.',
        missingPdfGenerator: 'Perpustakaan pembuat PDF tidak ditemukan; sertakan jsPDF atau pilih format gambar.',
        missingZipLibrary: 'Perpustakaan ZIP/unduhan tidak ditemukan; pastikan JSZip dan FileSaver dimuat.'
      },
      qualityMessages: {
        normal: 'Mode normal (150 DPI) menyeimbangkan kualitas dan ukuran.',
        high: 'Mode tinggi (220 DPI) lebih tajam tetapi menghasilkan file lebih besar.',
        ultra: 'Mode ultra (600 DPI) membutuhkan lebih lama; gunakan hanya jika perlu.'
      },
      longTaskMessages: {
        normal: { after15: 'Memproses file besar, harap tunggu sebentar.', after45: 'Jika terlalu lama, bagi file atau pilih kualitas lebih rendah.' },
        high: { after15: 'Pemrosesan dengan kualitas tinggi mungkin lebih lama.', after45: 'Harap tunggu lebih lama atau pilih kualitas rendah untuk ekspor lebih cepat.' },
        ultra: { after15: 'Mode ultra sedang berjalan, harap bersabar.', after45: 'Mode ultra membutuhkan lebih banyak waktu; pertimbangkan kualitas lebih rendah jika tidak perlu.' }
      }
    },
    it: {
      fileLabel: 'file', fileLabelPlural: 'file',
      imageLabel: 'immagine', imageLabelPlural: 'immagini',
      status: {
        chooseSupported: 'Seleziona tipi di file supportati.',
        listCleared: 'Elenco file cancellato.',
        fileRemoved: 'Il file è stato rimosso dall’elenco.',
        loadingPreviews: 'Caricamento file e generazione anteprime…',
        couldNotProcessFile: 'Impossibile elaborare il file {name}.',
        filesReady: 'I file sono pronti, clicca su "{action}".',
        missingPdfReader: 'Impossibile aggiungere PDF perché manca la libreria di lettura PDF.',
        unsupportedFormat: 'Impossibile aggiungere {detail} perché il formato non è supportato.',
        skippedPdf: 'Saltati {count} file PDF perché manca il lettore PDF.',
        skippedUnsupported: 'Saltati {count} file non supportati.',
        noValidFiles: 'Nessun file valido è stato aggiunto.',
        saveCanceled: 'Salvataggio annullato. Nessun file è stato scaricato.',
        conversionError: 'Si è verificato un errore durante la conversione. Riprova.',
        missingPdfGenerator: 'Manca la libreria di generazione PDF; includi jsPDF o scegli un formato immagine.',
        missingZipLibrary: 'Manca la libreria ZIP/download; assicurati di caricare JSZip e FileSaver.'
      },
      qualityMessages: {
        normal: 'La modalità normale (150 DPI) bilancia qualità e dimensione.',
        high: 'La modalità alta (220 DPI) è più nitida ma genera file più grandi.',
        ultra: 'La modalità ultra (600 DPI) richiede più tempo; usala solo quando necessario.'
      },
      longTaskMessages: {
        normal: { after15: 'Elaborazione file di grandi dimensioni in corso, attendi un attimo.', after45: 'Se impiega troppo tempo, dividi i file o scegli una qualità inferiore.' },
        high: { after15: 'La lavorazione ad alta qualità può durare più a lungo.', after45: 'Attendi qualche istante o scegli qualità inferiore per un’esportazione più rapida.' },
        ultra: { after15: 'Modalità ultra in corso, resta paziente.', after45: 'Questa modalità richiede più tempo; valuta di ridurre la qualità se non necessario.' }
      }
    },
    ja: {
      fileLabel: 'ファイル', fileLabelPlural: 'ファイル',
      imageLabel: '画像', imageLabelPlural: '画像',
      status: {
        chooseSupported: '対応するファイル形式を選択してください。',
        listCleared: 'ファイル一覧をクリアしました。',
        fileRemoved: 'ファイルがリストから削除されました。',
        loadingPreviews: 'ファイルを読み込み、プレビューを生成しています…',
        couldNotProcessFile: '{name} を処理できませんでした。',
        filesReady: 'ファイルの準備ができました。「{action}」をクリックしてください。',
        missingPdfReader: 'PDFリーダーライブラリがないため、PDFを追加できません。',
        unsupportedFormat: '{detail} はサポートされていない形式のため追加できませんでした。',
        skippedPdf: 'PDFリーダーがないため、{count}個のPDFファイルをスキップしました。',
        skippedUnsupported: 'サポートされていない{count}個のファイルをスキップしました。',
        noValidFiles: '有効なファイルが追加されていません。',
        saveCanceled: '保存がキャンセルされました。ファイルはダウンロードされませんでした。',
        conversionError: '変換中にエラーが発生しました。もう一度お試しください。',
        missingPdfGenerator: 'PDF生成ライブラリが見つかりません。jsPDFを読み込むか画像形式を選択してください。',
        missingZipLibrary: 'ZIP/ダウンロードライブラリが見つかりません。JSZipとFileSaverが読み込まれているか確認してください。'
      },
      qualityMessages: {
        normal: 'ノーマルモード（150 DPI）は品質とサイズのバランスが取れています。',
        high: '高画質モード（220 DPI）はより鮮明ですが、ファイルサイズが大きくなります。',
        ultra: 'ウルトラモード（600 DPI）は時間がかかるため、必要なときだけ使用してください。'
      },
      longTaskMessages: {
        normal: { after15: '大きなファイルを処理中です。しばらくお待ちください。', after45: '時間がかかりすぎる場合は、ファイルを分割するか画質を下げてください。' },
        high: { after15: '高画質では処理時間が長くなる可能性があります。', after45: 'もう少し待つか、より低い画質を選択して高速化してください。' },
        ultra: { after15: 'ウルトラモードで処理中です。しばらくお待ちください。', after45: 'ウルトラモードはさらに時間がかかります。必要な場合のみ使用してください。' }
      }
    },
    ko: {
      fileLabel: '파일', fileLabelPlural: '파일',
      imageLabel: '이미지', imageLabelPlural: '이미지',
      status: {
        chooseSupported: '지원되는 파일 형식을 선택하세요.',
        listCleared: '파일 목록이 비워졌습니다.',
        fileRemoved: '파일이 목록에서 제거되었습니다.',
        loadingPreviews: '파일을 불러오고 미리보기를 생성하는 중…',
        couldNotProcessFile: '{name} 파일을 처리할 수 없습니다.',
        filesReady: '파일이 준비되었습니다. "{action}"을 클릭하세요.',
        missingPdfReader: 'PDF 리더 라이브러리가 없어 PDF를 추가할 수 없습니다.',
        unsupportedFormat: '{detail}은(는) 지원되지 않는 형식이라 추가할 수 없습니다.',
        skippedPdf: 'PDF 리더가 없어 {count}개의 PDF 파일을 건너뛰었습니다.',
        skippedUnsupported: '{count}개의 지원되지 않는 파일을 건너뛰었습니다.',
        noValidFiles: '유효한 파일이 추가되지 않았습니다.',
        saveCanceled: '저장이 취소되었습니다. 파일이 다운로드되지 않았습니다.',
        conversionError: '변환 중 오류가 발생했습니다. 다시 시도하세요.',
        missingPdfGenerator: 'PDF 생성 라이브러리가 없습니다. jsPDF를 포함하거나 이미지 형식을 선택하세요.',
        missingZipLibrary: 'ZIP/다운로드 라이브러리가 없습니다. JSZip과 FileSaver를 로드해 주세요.'
      },
      qualityMessages: {
        normal: '일반 모드(150 DPI)는 품질과 용량의 균형을 맞춥니다.',
        high: '고화질 모드(220 DPI)는 더 선명하지만 파일이 커집니다.',
        ultra: '울트라 모드(600 DPI)는 시간이 더 걸리므로 필요한 경우에만 사용하세요.'
      },
      longTaskMessages: {
        normal: { after15: '큰 파일을 처리 중입니다. 잠시만 기다려 주세요.', after45: '너무 오래 걸리면 파일을 나누거나 낮은 품질을 선택하세요.' },
        high: { after15: '고품질 처리에는 시간이 더 걸릴 수 있습니다.', after45: '조금 더 기다리거나 더 낮은 품질을 선택해 빠르게 내보내세요.' },
        ultra: { after15: '울트라 모드 처리가 진행 중입니다. 잠시 기다리세요.', after45: '초고화질 모드는 더 많은 시간이 필요하니, 필요 없다면 품질을 낮추세요.' }
      }
    },
    ms: {
      fileLabel: 'fail', fileLabelPlural: 'fail',
      imageLabel: 'imej', imageLabelPlural: 'imej',
      status: {
        chooseSupported: 'Sila pilih jenis fail yang disokong.',
        listCleared: 'Senarai fail telah dikosongkan.',
        fileRemoved: 'Fail telah dikeluarkan daripada senarai.',
        loadingPreviews: 'Memuatkan fail dan menjana pratonton…',
        couldNotProcessFile: 'Tidak dapat memproses fail {name}.',
        filesReady: 'Fail sudah sedia, klik "{action}".',
        missingPdfReader: 'Tidak dapat menambah PDF kerana perpustakaan pembaca PDF tidak dijumpai.',
        unsupportedFormat: 'Tidak dapat menambah {detail} kerana format tidak disokong.',
        skippedPdf: 'Melepasi {count} fail PDF kerana pembaca tidak ada.',
        skippedUnsupported: 'Melepasi {count} fail yang tidak disokong.',
        noValidFiles: 'Tiada fail sah ditambah.',
        saveCanceled: 'Simpanan dibatalkan. Tiada fail dimuat turun.',
        conversionError: 'Ralat berlaku semasa penukaran. Sila cuba sekali lagi.',
        missingPdfGenerator: 'Perpustakaan menjana PDF tidak dijumpai; sertakan jsPDF atau pilih format imej.',
        missingZipLibrary: 'Perpustakaan ZIP/muat turun tidak dijumpai; pastikan JSZip dan FileSaver dimuat.'
      },
      qualityMessages: {
        normal: 'Mod normal (150 DPI) mengimbangi kualiti dan saiz.',
        high: 'Mod tinggi (220 DPI) lebih jelas tetapi menghasilkan fail lebih besar.',
        ultra: 'Mod ultra (600 DPI) mengambil masa lebih lama; guna hanya bila perlu.'
      },
      longTaskMessages: {
        normal: { after15: 'Menyediakan fail besar, sila tunggu sebentar.', after45: 'Jika terlalu lama, bahagikan fail atau pilih kualiti rendah.' },
        high: { after15: 'Pemprosesan kualiti tinggi mungkin mengambil masa lebih lama.', after45: 'Sila tunggu sedikit lagi atau pilih kualiti lebih rendah untuk eksport lebih pantas.' },
        ultra: { after15: 'Mod ultra sedang berjalan, sabar menunggu.', after45: 'Mod ultra memerlukan masa tambahan; pertimbangkan kualiti lebih rendah jika tidak perlu.' }
      }
    },
    'pt-br': {
      fileLabel: 'arquivo', fileLabelPlural: 'arquivos',
      imageLabel: 'imagem', imageLabelPlural: 'imagens',
      status: {
        chooseSupported: 'Selecione os tipos de arquivo compatíveis.',
        listCleared: 'Lista de arquivos limpa.',
        fileRemoved: 'O arquivo foi removido da lista.',
        loadingPreviews: 'Carregando arquivos e gerando pré-visualizações…',
        couldNotProcessFile: 'Não foi possível processar o arquivo {name}.',
        filesReady: 'Os arquivos estão prontos, clique em "{action}".',
        missingPdfReader: 'Não é possível adicionar o PDF porque falta o leitor de PDF.',
        unsupportedFormat: 'Não foi possível adicionar {detail} porque o formato não é compatível.',
        skippedPdf: '{count} arquivo(s) PDF foram ignorados porque o leitor está ausente.',
        skippedUnsupported: '{count} arquivo(s) não compatíveis foram ignorados.',
        noValidFiles: 'Nenhum arquivo válido foi adicionado.',
        saveCanceled: 'Salvamento cancelado. Nenhum arquivo foi baixado.',
        conversionError: 'Ocorreu um erro durante a conversão. Tente novamente.',
        missingPdfGenerator: 'Biblioteca de geração de PDF ausente; inclua o jsPDF ou escolha um formato de imagem.',
        missingZipLibrary: 'Biblioteca ZIP/download ausente; confirme se JSZip e FileSaver estão carregados.'
      },
      qualityMessages: {
        normal: 'O modo normal (150 DPI) equilibra qualidade e tamanho.',
        high: 'O modo alto (220 DPI) é mais nítido mas gera arquivos maiores.',
        ultra: 'O modo ultra (600 DPI) demora mais; use apenas quando necessário.'
      },
      longTaskMessages: {
        normal: { after15: 'Processando arquivos grandes, aguarde um momento.', after45: 'Se demorar muito, divida os arquivos ou escolha qualidade inferior.' },
        high: { after15: 'Processar em alta qualidade pode levar mais tempo.', after45: 'Aguarde mais ou escolha qualidade inferior para exportar mais rápido.' },
        ultra: { after15: 'Modo ultra em andamento, mantenha a espera.', after45: 'O modo ultra precisa de mais tempo; considere reduzir a qualidade se não for necessário.' }
      }
    },
    ru: {
      fileLabel: 'файл', fileLabelPlural: 'файлы',
      imageLabel: 'изображение', imageLabelPlural: 'изображения',
      status: {
        chooseSupported: 'Выберите поддерживаемые типы файлов.',
        listCleared: 'Список файлов очищен.',
        fileRemoved: 'Файл удалён из списка.',
        loadingPreviews: 'Загрузка файлов и создание превью…',
        couldNotProcessFile: 'Не удалось обработать файл {name}.',
        filesReady: 'Файлы готовы, нажмите "{action}".',
        missingPdfReader: 'Невозможно добавить PDF, так как отсутствует библиотека PDF.',
        unsupportedFormat: 'Невозможно добавить {detail}, потому что формат не поддерживается.',
        skippedPdf: 'Пропущено {count} PDF-файлов, так как отсутствует читатель.',
        skippedUnsupported: 'Пропущено {count} неподдерживаемых файлов.',
        noValidFiles: 'Не было добавлено ни одного допустимого файла.',
        saveCanceled: 'Сохранение отменено. Файлы не были загружены.',
        conversionError: 'Произошла ошибка при конвертации. Повторите попытку.',
        missingPdfGenerator: 'Отсутствует библиотека генерации PDF; подключите jsPDF или выберите формат изображения.',
        missingZipLibrary: 'Отсутствует библиотека ZIP/загрузки; убедитесь, что подключены JSZip и FileSaver.'
      },
      qualityMessages: {
        normal: 'Режим «Нормальный» (150 DPI) балансирует между качеством и размером.',
        high: 'Режим «Высокое» (220 DPI) дает более четкое изображение, но файлы больше.',
        ultra: 'Режим «Ультра» (600 DPI) занимает больше времени; используйте только при необходимости.'
      },
      longTaskMessages: {
        normal: { after15: 'Обработка больших файлов, пожалуйста, подождите немного.', after45: 'Если занимает слишком много времени, разделите файлы или выберите меньшую качество.' },
        high: { after15: 'Обработка в высоком качестве может занять больше времени.', after45: 'Подождите немного или выберите более низкое качество для быстрой экспорта.' },
        ultra: { after15: 'Режим ультра работает, пожалуйста, подождите.', after45: 'Режим ультра требует больше времени; уменьшите качество, если не критично.' }
      }
    },
    th: {
      fileLabel: 'ไฟล์', fileLabelPlural: 'ไฟล์',
      imageLabel: 'ภาพ', imageLabelPlural: 'ภาพ',
      status: {
        chooseSupported: 'กรุณาเลือกประเภทไฟล์ที่รองรับ',
        listCleared: 'รายการไฟล์ถูกล้างแล้ว',
        fileRemoved: 'ลบไฟล์ออกจากรายการแล้ว',
        loadingPreviews: 'กำลังโหลดไฟล์และสร้างตัวอย่าง…',
        couldNotProcessFile: 'ไม่สามารถประมวลผลไฟล์ {name} ได้',
        filesReady: 'ไฟล์พร้อมแล้ว คลิก "{action}"',
        missingPdfReader: 'ไม่สามารถเพิ่ม PDF ได้เนื่องจากไม่พบไลบรารีอ่าน PDF',
        unsupportedFormat: 'ไม่สามารถเพิ่ม {detail} ได้ เนื่องจากรูปแบบไม่รองรับ',
        skippedPdf: 'ข้าม {count} ไฟล์ PDF เนื่องจากไม่พบโปรแกรมอ่าน PDF',
        skippedUnsupported: 'ข้าม {count} ไฟล์ที่ไม่รองรับ',
        noValidFiles: 'ไม่มีไฟล์ที่ใช้งานได้ถูกเพิ่ม',
        saveCanceled: 'ยกเลิกการบันทึก ไฟล์ไม่ได้ดาวน์โหลด',
        conversionError: 'เกิดข้อผิดพลาดระหว่างการแปลง กรุณาลองใหม่',
        missingPdfGenerator: 'ไม่มีไลบรารีสร้าง PDF; กรุณาเพิ่ม jsPDF หรือเลือกเป็นภาพ',
        missingZipLibrary: 'ไม่มีไลบรารี ZIP/ดาวน์โหลด; กรุณาตรวจสอบให้แน่ใจว่า JSZip และ FileSaver ถูกโหลดแล้ว'
      },
      qualityMessages: {
        normal: 'โหมดปกติ (150 DPI) สมดุลคุณภาพและขนาด',
        high: 'โหมดสูง (220 DPI) ชัดขึ้นแต่ไฟล์ใหญ่ขึ้น',
        ultra: 'โหมดอัลตร้า (600 DPI) ใช้เวลานานขึ้น ใช้เฉพาะเมื่อจำเป็น'
      },
      longTaskMessages: {
        normal: { after15: 'กำลังประมวลผลไฟล์ขนาดใหญ่ โปรดรอสักครู่', after45: 'ถ้าใช้เวลานานเกินไป ให้แยกไฟล์หรือเลือกคุณภาพต่ำลง' },
        high: { after15: 'การประมวลผลคุณภาพสูงอาจใช้เวลานานขึ้น', after45: 'รออีกสักครู่หรือเลือกคุณภาพต่ำเพื่อส่งออกเร็วขึ้น' },
        ultra: { after15: 'กำลังทำงานในโหมดอัลตร้า โปรดอดทนรอ', after45: 'โหมดนี้ใช้เวลามากขึ้น หากไม่จำเป็นให้ลดคุณภาพ' }
      }
    },
    tr: {
      fileLabel: 'dosya', fileLabelPlural: 'dosyalar',
      imageLabel: 'görsel', imageLabelPlural: 'görseller',
      status: {
        chooseSupported: 'Desteklenen dosya türlerini seçin.',
        listCleared: 'Dosya listesi temizlendi.',
        fileRemoved: 'Dosya listeden kaldırıldı.',
        loadingPreviews: 'Dosyalar yükleniyor ve önizlemeler hazırlanıyor…',
        couldNotProcessFile: '{name} dosyası işlenemedi.',
        filesReady: 'Dosyalar hazır, "{action}" tıklayın.',
        missingPdfReader: 'PDF okuyucu kütüphanesi olmadığı için PDF eklenemiyor.',
        unsupportedFormat: '{detail} eklenemedi çünkü format desteklenmiyor.',
        skippedPdf: '{count} PDF dosyası atlandı çünkü okuyucu yok.',
        skippedUnsupported: '{count} desteklenmeyen dosya atlandı.',
        noValidFiles: 'Geçerli dosya eklenmedi.',
        saveCanceled: 'Kaydetme iptal edildi. Dosya indirilmedi.',
        conversionError: 'Dönüştürme sırasında hata oluştu. Lütfen tekrar deneyin.',
        missingPdfGenerator: 'PDF oluşturma kütüphanesi yok; jsPDF ekleyin veya görüntü formatı seçin.',
        missingZipLibrary: 'ZIP/indir kütüphanesi yok; JSZip ve FileSaver yüklü mü kontrol edin.'
      },
      qualityMessages: {
        normal: 'Normal mod (150 DPI) kalite ve boyutu dengeler.',
        high: 'Yüksek mod (220 DPI) daha nettir ama dosyalar daha büyüktür.',
        ultra: 'Ultra mod (600 DPI) daha uzun sürer; ihtiyaç varsa kullanın.'
      },
      longTaskMessages: {
        normal: { after15: 'Büyük dosyalar işleniyor, lütfen biraz bekleyin.', after45: 'Çok uzun sürerse dosyaları bölün veya daha düşük kalite seçin.' },
        high: { after15: 'Yüksek kalitede işlem daha uzun sürebilir.', after45: 'Biraz daha bekleyin veya daha düşük kalite seçerek daha hızlı dışa aktarın.' },
        ultra: { after15: 'Ultra modda işlem yapılıyor, sabırlı olun.', after45: 'Ultra mod daha fazla zaman alır; gerekmedikçe kaliteyi düşürün.' }
      }
    },
    ur: {
      fileLabel: 'فائل', fileLabelPlural: 'فائلیں',
      imageLabel: 'تصویر', imageLabelPlural: 'تصاویر',
      status: {
        chooseSupported: 'براہ کرم معاون فائل اقسام منتخب کریں۔',
        listCleared: 'فائل لسٹ خالی کر دی گئی ہے۔',
        fileRemoved: 'فائل فہرست سے ہٹا دی گئی ہے۔',
        loadingPreviews: 'فائلیں لوڈ ہو رہی ہیں اور پیش نظارہ تیار کیا جا رہا ہے…',
        couldNotProcessFile: 'فائل {name} پر عمل نہیں ہو سکا۔',
        filesReady: 'فائلیں تیار ہیں، "{action}" پر کلک کریں۔',
        missingPdfReader: 'PDF کو شامل نہیں کیا جا سکتا کیونکہ PDF ریڈر لائبریری موجود نہیں ہے۔',
        unsupportedFormat: '{detail} شامل نہیں کیا جا سکا کیونکہ فارمیٹ معاون نہیں ہے۔',
        skippedPdf: '{count} PDF فائلیں چھوڑ دی گئیں کیونکہ ریڈر موجود نہیں۔',
        skippedUnsupported: '{count} غیر معاون فائلیں چھوڑ دی گئیں۔',
        noValidFiles: 'کوئی درست فائل شامل نہیں کی گئی۔',
        saveCanceled: 'محفوظ کرنا منسوخ کر دیا گیا۔ کوئی فائل ڈاؤن لوڈ نہیں ہوئی۔',
        conversionError: 'تبدیلی کے دوران ایک خرابی پیش آئی۔ دوبارہ کوشش کریں。',
        missingPdfGenerator: 'PDF جنریٹر لائبریری موجود نہیں؛ jsPDF شامل کریں یا ڈیٹا تصویر فارمیٹ منتخب کریں۔',
        missingZipLibrary: 'ZIP/ڈاؤن لوڈ لائبریری موجود نہیں؛ JSZip اور FileSaver لوڈ ہونے کی تصدیق کریں۔'
      },
      qualityMessages: {
        normal: 'عام موڈ (150 DPI) معیار اور حجم میں توازن کرتا ہے۔',
        high: 'اعلیٰ موڈ (220 DPI) زیادہ واضح ہے لیکن فائلیں بڑی ہوتی ہیں۔',
        ultra: 'الٹرا موڈ (600 DPI) طویل وقت لیتا ہے؛ ضرورت پر ہی استعمال کریں۔'
      },
      longTaskMessages: {
        normal: { after15: 'بڑی فائلوں پر کام ہو رہا ہے، براہ کرم تھوڑا انتظار کریں۔', after45: 'اگر زیادہ وقت لگ رہا ہو تو فائلوں کو تقسیم کریں یا کم معیار منتخب کریں۔' },
        high: { after15: 'اعلیٰ معیار کی پروسیسنگ زیادہ وقت لے سکتی ہے۔', after45: 'مزید انتظار کریں یا تیز برآمدی کے لیے کم معیار منتخب کریں۔' },
        ultra: { after15: 'الٹرا موڈ فعال ہے، صبر سے انتظار کریں۔', after45: 'یہ موڈ زیادہ وقت لیتا ہے؛ غیر ضروری ہو تو معیار گھٹا دیں۔' }
      }
    },
    vi: {
      fileLabel: 'tệp', fileLabelPlural: 'tệp',
      imageLabel: 'ảnh', imageLabelPlural: 'ảnh',
      status: {
        chooseSupported: 'Vui lòng chọn các loại tệp được hỗ trợ.',
        listCleared: 'Đã xóa danh sách tệp.',
        fileRemoved: 'Đã xóa tệp khỏi danh sách.',
        loadingPreviews: 'Đang tải tệp và tạo xem trước…',
        couldNotProcessFile: 'Không thể xử lý tệp {name}.',
        filesReady: 'Tệp đã sẵn sàng, nhấn "{action}".',
        missingPdfReader: 'Không thể thêm PDF vì thiếu thư viện đọc PDF.',
        unsupportedFormat: 'Không thể thêm {detail} vì định dạng không được hỗ trợ.',
        skippedPdf: 'Bỏ qua {count} tệp PDF vì thiếu trình đọc.',
        skippedUnsupported: 'Bỏ qua {count} tệp không được hỗ trợ.',
        noValidFiles: 'Chưa có tệp hợp lệ nào được thêm.',
        saveCanceled: 'Hủy lưu. Chưa có tệp nào được tải xuống.',
        conversionError: 'Đã xảy ra lỗi trong quá trình chuyển đổi. Vui lòng thử lại.',
        missingPdfGenerator: 'Thiếu thư viện tạo PDF; vui lòng bao gồm jsPDF hoặc chọn định dạng ảnh.',
        missingZipLibrary: 'Thiếu thư viện ZIP/ tải xuống; vui lòng đảm bảo JSZip và FileSaver đã được tải.'
      },
      qualityMessages: {
        normal: 'Chế độ thường (150 DPI) cân bằng chất lượng và kích thước.',
        high: 'Chế độ cao (220 DPI) rõ hơn nhưng tạo file lớn hơn.',
        ultra: 'Chế độ siêu (600 DPI) mất nhiều thời gian hơn; chỉ dùng khi cần.'
      },
      longTaskMessages: {
        normal: { after15: 'Đang xử lý file lớn, vui lòng đợi chút.', after45: 'Nếu mất quá lâu, chia nhỏ file hoặc chọn chất lượng thấp hơn.' },
        high: { after15: 'Xử lý chất lượng cao có thể mất nhiều thời gian hơn.', after45: 'Vui lòng chờ thêm hoặc chọn chất lượng thấp hơn để xuất nhanh hơn.' },
        ultra: { after15: 'Đang ở chế độ siêu, vui lòng chờ đợi.', after45: 'Chế độ này cần nhiều thời gian hơn; nếu không cần thiết hãy giảm chất lượng.' }
      }
    },
    'zh-cn': {
      fileLabel: '文件', fileLabelPlural: '文件',
      imageLabel: '图片', imageLabelPlural: '图片',
      status: {
        chooseSupported: '请选择支持的文件类型。',
        listCleared: '文件列表已清空。',
        fileRemoved: '文件已从列表中移除。',
        loadingPreviews: '正在加载文件并生成预览…',
        couldNotProcessFile: '无法处理文件 {name}。',
        filesReady: '文件已准备好，请点击“{action}”。',
        missingPdfReader: '由于缺少 PDF 阅读库，无法添加 PDF。',
        unsupportedFormat: '无法添加 {detail}，因为该格式不受支持。',
        skippedPdf: '跳过了 {count} 个 PDF 文件，因为缺少阅读器。',
        skippedUnsupported: '跳过了 {count} 个不受支持的文件。',
        noValidFiles: '未添加任何有效文件。',
        saveCanceled: '保存已取消。未下载任何文件。',
        conversionError: '转换过程中出现错误。请再试一次。',
        missingPdfGenerator: '缺少 PDF 生成库，请确保已加载 jsPDF 或选择图片格式。',
        missingZipLibrary: '缺少 ZIP/下载库，请确保已加载 JSZip 和 FileSaver。'
      },
      qualityMessages: {
        normal: '标准模式（150 DPI）在质量和大小之间取得平衡。',
        high: '高清模式（220 DPI）更清晰，但生成的文件更大。',
        ultra: '超清模式（600 DPI）需要更多时间，仅在必要时使用。'
      },
      longTaskMessages: {
        normal: { after15: '正在处理大型文件，请稍等。', after45: '如果耗时过久，可拆分文件或选择较低质量。' },
        high: { after15: '高质量处理可能需要更长时间。', after45: '请再等一下，或选较低质量以更快导出。' },
        ultra: { after15: '超清模式正在处理，请耐心等待。', after45: '超清模式需要更多时间，如无必要可改为较低质量。' }
      }
    }
  };

  const defaultConfig = {
    slug: 'chuyen-doi',
    fileLabel: 'tệp',
    fileLabelPlural: 'tệp',
    input: {
      label: 'ảnh',
      labelPlural: 'ảnh',
      labelWhenUnknown: 'ảnh',
      mimeTypes: ['image/png', 'image/jpeg', 'image/pjpeg', 'image/webp', 'image/gif'],
      extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif'],
      accept: '.png,.jpg,.jpeg,.webp,.gif,image/png,image/jpeg,image/pjpeg,image/webp,image/gif',
      description: 'Supports PNG, JPG, JPEG, WebP, and GIF files.'
    },
    outputs: {
      jpg: { formatLabel: 'JPG', buttonLabel: 'Xuất ảnh JPG', zipNameBase: 'anh-sang-jpg', mimeType: 'image/jpeg', fileExtension: 'jpg' },
      png: { formatLabel: 'PNG', buttonLabel: 'Xuất ảnh PNG', zipNameBase: 'anh-sang-png', mimeType: 'image/png', fileExtension: 'png' },
      webp:{ formatLabel: 'WebP',buttonLabel: 'Xuất ảnh WebP',zipNameBase: 'anh-sang-webp', mimeType: 'image/webp', fileExtension: 'webp' },
      gif: { formatLabel: 'GIF', buttonLabel: 'Xuất ảnh GIF', zipNameBase: 'anh-sang-gif', mimeType: 'image/gif', fileExtension: 'gif' },
      jpeg:{ formatLabel: 'JPEG',buttonLabel: 'Xuất ảnh JPEG',zipNameBase: 'anh-sang-jpeg', mimeType: 'image/jpeg', fileExtension: 'jpeg' },
      pdf: { formatLabel: 'PDF', buttonLabel: 'Xuất thành PDF', zipNameBaseMerged: 'anh-gop-pdf', zipNameBaseSeparate: 'anh-sang-pdf' }
    },
    availableOutputs: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'pdf'],
    defaultOutput: 'jpg',
    allowPdfInput: false
  };

  const userConfig = window.CONVERTER_CONFIG || {};
  const config = mergeConfig(defaultConfig, userConfig);

  const requestedLocale = (document.documentElement.lang || (userConfig.locale || '')).toLowerCase();
  const localeCandidates = [requestedLocale, requestedLocale.split('-')[0]];
  const localeKey = localeCandidates.find(code => code && LOCALE_TEXT.hasOwnProperty(code)) || 'en';
  const localeDefaults = LOCALE_TEXT[localeKey] || LOCALE_TEXT.en;

  function formatTemplate(template = '', data = {}) {
    if (!template) return '';
    return template.replace(/\{([^}]+)\}/g, (_, token) => {
      const value = data?.[token];
      if (value === undefined || value === null) return '';
      return value.toString();
    });
  }

  const STATUS_DEFAULTS = LOCALE_TEXT.en.status;
  const userStatus = config.i18n?.status || {};
  const localeStatus = localeDefaults.status || {};

  function resolveStatusTemplate(key) {
    return userStatus[key] || localeStatus[key] || STATUS_DEFAULTS[key] || '';
  }

  function statusText(key, data = {}) {
    return formatTemplate(resolveStatusTemplate(key), data);
  }

  if (!Object.prototype.hasOwnProperty.call(userConfig, 'fileLabel') && localeDefaults.fileLabel) {
    config.fileLabel = localeDefaults.fileLabel;
  }
  if (!Object.prototype.hasOwnProperty.call(userConfig, 'fileLabelPlural') && localeDefaults.fileLabelPlural) {
    config.fileLabelPlural = localeDefaults.fileLabelPlural;
  }

  const userInput = userConfig.input || {};
  if (!Object.prototype.hasOwnProperty.call(userInput, 'label') && localeDefaults.imageLabel) {
    config.input = config.input || {};
    config.input.label = localeDefaults.imageLabel;
  }
  if (!Object.prototype.hasOwnProperty.call(userInput, 'labelPlural') && localeDefaults.imageLabelPlural) {
    config.input = config.input || {};
    config.input.labelPlural = localeDefaults.imageLabelPlural;
  }
  if (!Object.prototype.hasOwnProperty.call(userInput, 'labelWhenUnknown') && localeDefaults.imageLabel) {
    config.input = config.input || {};
    config.input.labelWhenUnknown = localeDefaults.imageLabel;
  }
  const slugParts = (config.slug || '').split('-sang-');
  const inputFormatKey = (slugParts[0] || '').toLowerCase();
  const outputFormatKey = (slugParts[1] || config.defaultOutput || '').toLowerCase();

  const dropzone = document.querySelector('#dropzone');
  const conversionFlow = document.querySelector('.conversion-flow');
  const fileInput = document.querySelector('#fileInput');
  const grid = document.querySelector('#fileGrid');
  const emptyState = document.querySelector('#emptyState');
  const selectionBar = document.querySelector('#selectionBar');
  const selectionCount = document.querySelector('#selectionCount');
  const pageCount = document.querySelector('#pageCount');
  const convertBtn = document.querySelector('#convertBtn');
  const convertLabel = convertBtn?.querySelector('span');
  const progressWrap = document.querySelector('#progressWrap');
  const progressBar = document.querySelector('#progressBar');
  const statusMessage = document.querySelector('#statusMessage');
  const optsToggle = document.querySelector('#optsToggle');
  const panel = document.querySelector('#panel');
  const chooseBtn = document.querySelector('#chooseBtn');
  const formatOptions = document.querySelector('#formatOptions');
  const pdfOptions = document.querySelector('#pdfOptions');
  let formatButtons = Array.from(document.querySelectorAll('.format-btn'));
  const pdfModeButtons = Array.from(document.querySelectorAll('.pdf-mode-btn'));

  if (!dropzone || !fileInput || !grid || !convertBtn) {
    console.error('Thiếu phần tử giao diện cần thiết.');
    return;
  }

  const supportedOutputs = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'pdf'];
  let availableOutputs = Array.isArray(config.availableOutputs)
    ? config.availableOutputs.filter(fmt => supportedOutputs.includes(fmt) && config.outputs[fmt])
    : supportedOutputs.filter(fmt => config.outputs[fmt]);
  if (!availableOutputs.length) availableOutputs = Object.keys(config.outputs || {}).filter(k => supportedOutputs.includes(k));
  if (!availableOutputs.length) availableOutputs = ['jpg'];

  formatButtons.forEach(btn => { if (!availableOutputs.includes(btn.dataset.format)) btn.remove(); });
  formatButtons = Array.from(document.querySelectorAll('.format-btn'));

  const imageConfig = config.input || {};
  const imageMimeSet = new Set((imageConfig.mimeTypes || []).filter(Boolean));
  const imageExtensions = (imageConfig.extensions || []).map(e => e.replace(/^\./, ''));
  const extensionPattern = imageExtensions.length ? new RegExp(`\\.(${imageExtensions.join('|')})$`, 'i') : null;
  const allowImageInput = Boolean(imageMimeSet.size || imageExtensions.length);
  const pdfjs = config.allowPdfInput ? (window.pdfjsLib || null) : null;

  if (fileInput) {
    const accepts = [];
    if (imageConfig.accept) accepts.push(imageConfig.accept);
    if (config.allowPdfInput) accepts.push('.pdf,application/pdf');
    if (accepts.length) fileInput.setAttribute('accept', accepts.join(','));
  }

  const initialOutput = availableOutputs.includes(config.defaultOutput) ? config.defaultOutput : availableOutputs[0];
  const singleOutput = availableOutputs.length === 1;

  const state = {
    files: [],
    quality: 'normal',
    pdfMode: 'merged',
    outputFormat: initialOutput,
    converting: false
  };

  const i18n = config.i18n || {};
  const qualityMessages = {
    normal: i18n.qualityMessages?.normal || localeDefaults.qualityMessages?.normal || 'Normal mode (150 DPI) balances quality and size.',
    high:   i18n.qualityMessages?.high   || localeDefaults.qualityMessages?.high   || 'High mode (220 DPI) is clearer but produces larger files.',
    ultra:  i18n.qualityMessages?.ultra  || localeDefaults.qualityMessages?.ultra  || 'Ultra mode (600 DPI) takes longer; use it only when needed.'
  };

  const LONG_TASK_MESSAGES = localeDefaults.longTaskMessages || {
    normal: { after15: 'Processing large files, please wait a bit longer.', after45: 'If it takes too long, split files or choose lower quality.' },
    high:   { after15: 'Processing at high quality may take longer.', after45: 'Please wait more or choose lower quality for faster export.' },
    ultra:  { after15: 'Processing in ultra mode, please keep waiting.', after45: 'Ultra mode needs more time; consider lower quality if needed.' }
  };

  function updateStatus(text = '', tone = 'info') {
    if (!statusMessage) return;
    if (!text) {
      statusMessage.className = 'status';
      statusMessage.textContent = '';
    } else {
      statusMessage.textContent = text;
      statusMessage.className = `status show ${tone}`;
    }
  }

  const DOWNLOAD_HINT_BROWSER = 'Check your browser downloads folder to open the file.';
  const DOWNLOAD_HINT_FOLDER = 'Check the folder you selected to open the files.';

  function describeDownloadedTargets(names = []) {
    const cleaned = (names || [])
      .map(name => (name || '').toString())
      .map(name => name.trim().replace(/\s+/g, ' '))
      .filter(Boolean);
    if (!cleaned.length) return '';
    const quoted = cleaned.map(name => `"${name}"`);
    if (quoted.length === 1) return `File ${quoted[0]}`;
    if (quoted.length === 2) return `Files ${quoted[0]} and ${quoted[1]}`;
    if (quoted.length === 3) return `Files ${quoted[0]}, ${quoted[1]} and ${quoted[2]}`;
    return `Files ${quoted[0]}, ${quoted[1]} and ${quoted.length - 2} more`;
  }

  function buildDownloadAnnouncement(detail, hint) {
    const trimmed = detail ? detail.toString().trim().replace(/\.*$/, '') : '';
    const baseSentence = trimmed ? `Done. ${trimmed}.` : 'Done.';
    return hint ? `${baseSentence} ${hint}` : baseSentence;
  }

  let floatingAlertTimeout = null;

  function ensureFloatingAlert() {
    let container = document.querySelector('#floatingAlert');
    if (container) return container;
    container = document.createElement('div');
    container.id = 'floatingAlert';
    container.className = 'floating-alert';
    document.body.appendChild(container);
    return container;
  }

  function hideFloatingAlert() {
    const alertEl = ensureFloatingAlert();
    if (!alertEl) return;
    if (floatingAlertTimeout) {
      clearTimeout(floatingAlertTimeout);
      floatingAlertTimeout = null;
    }
    alertEl.classList.remove('visible');
    alertEl.classList.add('exiting');
    const cleanup = () => {
      alertEl.classList.remove('exiting');
      alertEl.removeEventListener('animationend', cleanup);
    };
    alertEl.addEventListener('animationend', cleanup);
  }

  function showFloatingAlert(message, tone = 'warn', duration = 5000) {
    if (!message) return;
    const alertEl = ensureFloatingAlert();
    alertEl.textContent = message;
    alertEl.dataset.tone = tone;
    alertEl.classList.remove('exiting');
    alertEl.classList.add('visible');
    if (floatingAlertTimeout) clearTimeout(floatingAlertTimeout);
    floatingAlertTimeout = setTimeout(() => {
      hideFloatingAlert();
    }, duration);
  }

  function updateSelection() {
    const fileTotal = state.files.length;
    if (!fileTotal) {
      selectionBar && (selectionBar.style.display = 'none');
      selectionCount && (selectionCount.textContent = '0 ' + (config.fileLabelPlural || 'files'));
      pageCount && (pageCount.textContent = '0 ' + (imageConfig.labelPlural || 'images'));
    } else {
      selectionBar && (selectionBar.style.display = 'flex');
      selectionCount && (selectionCount.textContent = `${fileTotal} ${fileTotal === 1 ? (config.fileLabel || 'file') : (config.fileLabelPlural || 'files')}`);
      const itemTotal = state.files.reduce((sum, e) => sum + (e.type === 'pdf' ? Math.max(1, e.pages || 0) : 1), 0);
      pageCount && (pageCount.textContent = `${itemTotal} ${itemTotal === 1 ? (imageConfig.label || 'image') : (imageConfig.labelPlural || 'images')}`);
    }
    emptyState && (emptyState.style.display = fileTotal ? 'none' : 'block');
    convertBtn.disabled = !fileTotal || state.converting;
  }

  function applyConversionIcons() {
    if (!conversionFlow) return;
    const icons = conversionFlow.querySelectorAll('.icon');
    const arrow = conversionFlow.querySelector('.arrow');
    icons.forEach(icon => {
      icon.textContent = '';
      icon.setAttribute('aria-hidden', 'true');
    });
    if (arrow) {
      arrow.textContent = '';
      arrow.setAttribute('aria-hidden', 'true');
    }
  }

  function renderGrid() {
    if (!grid) return;
    if (!state.files.length) {
      grid.innerHTML = '';
      updateSelection();
      return;
    }
    const cards = state.files.map(entry => {
      const info = entry.type === 'pdf'
        ? (entry.pages ? `${entry.pages} page` : 'Counting pages…')
        : (entry.imageInfo ? `${entry.imageInfo.width}×${entry.imageInfo.height}` : '1 image');
      const alt = entry.type === 'pdf' ? `First page of ${entry.name}` : `Preview image of ${entry.name}`;
      const thumb = entry.thumb ? `<img src="${entry.thumb}" alt="${alt}">` : '<span class="muted">Generating preview…</span>';
      return `
        <div class="card">
          <button class="remove" type="button" data-remove="${entry.id}" title="Remove file">×</button>
          <div class="thumb" data-pages="${info}">
            ${thumb}
          </div>
          <div class="filename" title="${entry.name}">${entry.name}</div>
        </div>`;
    }).join('');
    grid.innerHTML = cards;
    updateSelection();
  }

  const QUALITY_PRESETS = {
    normal: { label: 'bình thường', dpi: 150, jpegQuality: 0.82, message: qualityMessages.normal, tone: 'info' },
    high:   { label: 'cao',          dpi: 220, jpegQuality: 0.92, message: qualityMessages.high,   tone: 'info' },
    ultra:  { label: 'siêu nét',     dpi: 600, jpegQuality: 1.00, message: qualityMessages.ultra,  tone: 'warn' }
  };

  function setQuality(quality) {
    const key = QUALITY_PRESETS[quality] ? quality : 'normal';
    state.quality = key;
    document.querySelectorAll('.qitem').forEach(el => {
      const active = el.dataset.quality === key;
      el.classList.toggle('active', active);
      el.setAttribute('aria-checked', active ? 'true' : 'false');
    });
    updateStatus(QUALITY_PRESETS[key].message, QUALITY_PRESETS[key].tone);
  }

  function updateConvertLabel() {
    if (!convertLabel) return;
    const currentOutput = config.outputs[state.outputFormat] || {};
    convertLabel.textContent = currentOutput.buttonLabel || 'Bắt đầu chuyển đổi';
  }

  function setOutputFormat(format) {
    const next = availableOutputs.includes(format) ? format : availableOutputs[0];
    state.outputFormat = next;
    formatButtons.forEach(btn => {
      const active = btn.dataset.format === next;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    updateConvertLabel();
    updatePdfOptionsVisibility();
  }

  function updatePdfOptionsVisibility() {
    if (!pdfOptions) return;
    const show = state.outputFormat === 'pdf';
    pdfOptions.style.display = show ? 'block' : 'none';
    pdfOptions.setAttribute('aria-hidden', show ? 'false' : 'true');
    pdfModeButtons.forEach(btn => {
      btn.disabled = !show;
      btn.setAttribute('aria-disabled', show ? 'false' : 'true');
    });
    if (show) setPdfMode(state.pdfMode);
  }

  function setPdfMode(mode) {
    const next = mode === 'separate' ? 'separate' : 'merged';
    state.pdfMode = next;
    pdfModeButtons.forEach(btn => {
      const active = btn.dataset.mode === next;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  function isPdfFile(file) {
    return file && (file.type === 'application/pdf' || /\.pdf$/i.test(file.name || ''));
  }
  function isImageFile(file) {
    if (!file || isPdfFile(file)) return false;
    if (!allowImageInput) return false;
    const typeMatch = imageMimeSet.size ? imageMimeSet.has(file.type) : false;
    const extMatch = extensionPattern ? extensionPattern.test(file.name || '') : false;
    const fallback = !imageMimeSet.size && !extensionPattern ? (file.type || '').startsWith('image/') : false;
    return typeMatch || extMatch || fallback;
  }

  async function loadPdf(entry) {
    if (!pdfjs) throw new Error('Thư viện PDF chưa sẵn sàng.');
    if (entry.pdf) return entry.pdf;
    const buffer = await fileToArrayBuffer(entry.file);
    entry.pdf = await pdfjs.getDocument({data: buffer}).promise;
    entry.pages = entry.pdf.numPages;
    return entry.pdf;
  }
  async function renderPdfPageToCanvas(page, scale) {
    const viewport = page.getViewport({scale});
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.floor(viewport.width));
    canvas.height = Math.max(1, Math.floor(viewport.height));
    const ctx = canvas.getContext('2d', {alpha: false});
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({canvasContext: ctx, viewport}).promise;
    return canvas;
  }
  async function loadPdfPreview(entry) {
    const pdf = await loadPdf(entry);
    const page = await pdf.getPage(1);
    const canvas = await renderPdfPageToCanvas(page, 1.1);
    entry.thumb = canvas.toDataURL('image/jpeg', 0.75);
  }
  async function loadImagePreview(entry) {
    if (typeof entry.revokeThumb === 'function') entry.revokeThumb();
    const objectUrl = URL.createObjectURL(entry.file);
    await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        entry.pages = 1;
        entry.imageInfo = { width: img.naturalWidth || img.width, height: img.naturalHeight || img.height };
        entry.thumb = objectUrl;
        entry.revokeThumb = () => { URL.revokeObjectURL(objectUrl); entry.revokeThumb = null; };
        resolve();
      };
      img.onerror = (e) => { URL.revokeObjectURL(objectUrl); reject(e || new Error('Không thể tải ảnh xem trước.')); };
      img.src = objectUrl;
    });
  }

  async function rasterizeImageFile(file, {preserveAlpha = false} = {}) {
    if ('createImageBitmap' in window && typeof createImageBitmap === 'function') {
      let bitmap;
      try {
        bitmap = await createImageBitmap(file);
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, bitmap.width || 1);
        canvas.height = Math.max(1, bitmap.height || 1);
        const ctx = canvas.getContext('2d', {alpha: preserveAlpha});
        if (!preserveAlpha) { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height); } else { ctx.clearRect(0, 0, canvas.width, canvas.height); }
        ctx.drawImage(bitmap, 0, 0);
        bitmap.close?.();
        return canvas;
      } catch (e) {
        bitmap?.close?.();
      }
    }
    const objectUrl = URL.createObjectURL(file);
    try {
      const img = await new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = objectUrl;
      });
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width || 1;
      canvas.height = img.naturalHeight || img.height || 1;
      const ctx = canvas.getContext('2d', {alpha: preserveAlpha});
      if (!preserveAlpha) { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height); } else { ctx.clearRect(0, 0, canvas.width, canvas.height); }
      ctx.drawImage(img, 0, 0);
      return canvas;
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }

  async function canvasToGif(canvas, outputConfig = {}) {
    const direct = await new Promise(resolve => {
      if (typeof canvas.toBlob !== 'function') return resolve(null);
      canvas.toBlob(b => resolve(b && b.type === 'image/gif' ? b : null), 'image/gif');
    });
    if (direct) return direct;
    if (typeof gifshot === 'object' && typeof gifshot?.createGIF === 'function') {
      const dataUrl = canvas.toDataURL('image/png');
      return await new Promise((resolve, reject) => {
        gifshot.createGIF({ gifWidth: canvas.width || 1, gifHeight: canvas.height || 1, images: [dataUrl], interval: 0.1, numFrames: 1, frameDuration: 1, sampleInterval: outputConfig.gifSampleInterval || 5, numWorkers: 2 }, (result) => {
          if (result.error) return reject(new Error(result.errorMsg || 'Không thể tạo ảnh GIF.'));
          try { resolve(dataUrlToBlob(result.image)); } catch (err) { reject(err); }
        });
      });
    }
    throw new Error('Thư viện tạo GIF chưa sẵn sàng.');
  }

  async function canvasToImageBlob(canvas, outputConfig, preset) {
    const mimeType = outputConfig?.mimeType || 'image/jpeg';
    const qualityHint = typeof preset?.jpegQuality === 'number' ? preset.jpegQuality : 0.92;
    if (mimeType === 'image/gif') return await canvasToGif(canvas, outputConfig);
    const quality = mimeType === 'image/jpeg' ? qualityHint : (mimeType === 'image/webp' ? (typeof outputConfig?.webpQuality === 'number' ? outputConfig.webpQuality : qualityHint) : undefined);
    if (typeof canvas.toBlob === 'function') {
      const blob = await new Promise(resolve => canvas.toBlob(resolve, mimeType, quality));
      if (blob) return blob;
    }
    return dataUrlToBlob(canvas.toDataURL(mimeType, quality));
  }

  function attachEventListeners() {
    chooseBtn?.setAttribute('type', 'button');
    chooseBtn?.setAttribute('aria-controls', 'fileInput');
    chooseBtn?.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); fileInput.click(); });
    chooseBtn?.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); } });

    dropzone.addEventListener('click', (e) => { if (e.target.closest('button')) return; fileInput.click(); });
    ['dragenter', 'dragover'].forEach(evt => dropzone.addEventListener(evt, (e) => { e.preventDefault(); dropzone.classList.add('dragover'); if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'; }));
    dropzone.addEventListener('dragleave', (e) => { if (e.target === dropzone) dropzone.classList.remove('dragover'); });
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault(); dropzone.classList.remove('dragover');
      const files = Array.from(e.dataTransfer?.files || []).filter(f => (config.allowPdfInput && isPdfFile(f)) || isImageFile(f));
      if (files.length) handleFiles(files); else updateStatus(imageConfig.description || statusText('chooseSupported'), 'warn');
    });

    fileInput.addEventListener('change', () => { const files = Array.from(fileInput.files || []); handleFiles(files); fileInput.value = ''; });

    document.querySelector('#clearAll')?.addEventListener('click', () => { state.files.forEach(cleanupEntry); state.files = []; renderGrid(); updateStatus(statusText('listCleared'), 'info'); });

    grid.addEventListener('click', (e) => { const btn = e.target.closest('[data-remove]'); if (!btn) return; const id = btn.getAttribute('data-remove'); const entry = state.files.find(f => f.id === id); if (entry) cleanupEntry(entry); state.files = state.files.filter(f => f.id !== id); renderGrid(); updateStatus(statusText('fileRemoved'), 'info'); });

    document.querySelectorAll('.qitem').forEach(item => {
      item.addEventListener('click', () => setQuality(item.dataset.quality));
      item.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setQuality(item.dataset.quality); } });
    });

    formatButtons.forEach(btn => btn.addEventListener('click', () => setOutputFormat(btn.dataset.format)));

    pdfModeButtons.forEach(btn => btn.addEventListener('click', () => { if (!btn.disabled) setPdfMode(btn.dataset.mode); }));

    convertBtn.addEventListener('click', convert);

    window.addEventListener('dragover', e => e.preventDefault());
    window.addEventListener('drop', e => e.preventDefault());

    const mql = window.matchMedia('(max-width:1100px)');
    function handleResponsive() { if (!optsToggle || !panel) return; const isCompact = mql.matches; optsToggle.style.display = isCompact ? 'inline-flex' : 'none'; if (!isCompact) panel.classList.remove('open'); }
    handleResponsive(); mql.addEventListener('change', handleResponsive);
    optsToggle?.addEventListener('click', () => panel?.classList.toggle('open'));
    document.addEventListener('click', (event) => { if (!panel || !optsToggle || !panel.classList.contains('open') || !mql.matches) return; if (panel.contains(event.target)) return; if (optsToggle.contains(event.target)) return; panel.classList.remove('open'); });

    window.addEventListener('keydown', (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'o') { e.preventDefault(); fileInput.click(); } });
  }

  function cleanupEntry(entry) {
    if (!entry) return;
    if (entry.pdf && typeof entry.pdf.destroy === 'function') { try { entry.pdf.destroy(); } catch {} }
    entry.pdf = null;
    if (typeof entry.revokeThumb === 'function') { try { entry.revokeThumb(); } catch {} }
    entry.thumb = null; entry.revokeThumb = null; entry.imageInfo = null;
  }

  async function handleFiles(files) {
    if (!files.length) return;
    updateStatus(statusText('loadingPreviews'), 'info');
    let added = 0; const skippedPdf = []; const unsupported = [];
    for (const file of files) {
      const pdfCandidate = config.allowPdfInput && isPdfFile(file);
      const imageCandidate = isImageFile(file);
      if (!pdfCandidate && !imageCandidate) { unsupported.push(file.name); continue; }
      if (pdfCandidate && !pdfjs) { skippedPdf.push(file.name); continue; }
      const id = Math.random().toString(36).slice(2, 9);
      const entry = { id, type: pdfCandidate ? 'pdf' : 'image', file, name: file.name, pdf: null, pages: pdfCandidate ? 0 : 1, thumb: null, revokeThumb: null, imageInfo: null };
      state.files.push(entry);
      try { if (pdfCandidate) await loadPdfPreview(entry); else await loadImagePreview(entry); added++; } catch (err) { console.error('Cannot process file for preview.', err); cleanupEntry(entry); state.files = state.files.filter(f => f.id !== id); updateStatus(statusText('couldNotProcessFile', {name: file.name}), 'error'); }
    }
    renderGrid();
    if (added) {
      const notes = [];
      if (skippedPdf.length) notes.push(statusText('skippedPdf', {count: skippedPdf.length}));
      if (unsupported.length) notes.push(statusText('skippedUnsupported', {count: unsupported.length}));
      const outputDetails = config.outputs[state.outputFormat] || {}; const actionLabel = outputDetails.buttonLabel || 'Start converting';
      const readyMessage = statusText('filesReady', {action: actionLabel});
      const statusParts = [readyMessage, ...notes].filter(Boolean);
      updateStatus(statusParts.join(' '), notes.length ? 'warn' : 'success');
    } else if (skippedPdf.length) {
      updateStatus(statusText('missingPdfReader'), 'error');
    } else if (unsupported.length) {
      const previewCount = 3;
      const rawPreview = unsupported.slice(0, previewCount);
      const normalizedPreview = rawPreview
        .map(name => (name || '').toString().trim().replace(/\s+/g, ' '))
        .filter(Boolean);
      const previewNames = normalizedPreview.length ? normalizedPreview : rawPreview;
      const formattedNames = previewNames.map(name => `"${name}"`).join(', ');
      const extraCount = unsupported.length - previewNames.length;
      const extraText = extraCount > 0 ? ` and ${extraCount} more` : '';
      const detailSegment = unsupported.length === 1
        ? `file ${formattedNames}`
        : `${unsupported.length} files (${formattedNames}${extraText})`;
      const reason = imageConfig.description || statusText('chooseSupported');
      const message = `Could not add ${detailSegment} because the format is unsupported. ${reason}`;
      updateStatus(message, 'warn');
      showFloatingAlert(message, 'warn', 5000);
    } else {
      updateStatus(statusText('noValidFiles'), 'info');
    }
  }

  function createLongTaskTimers(quality = 'normal', tone = 'info') {
    const messages = LONG_TASK_MESSAGES[quality] || { after15: '', after45: '' };
    const timers = [];
    if (messages.after15) timers.push(setTimeout(() => updateStatus(messages.after15, tone), 15000));
    if (messages.after45) timers.push(setTimeout(() => updateStatus(messages.after45, tone), 45000));
    return () => timers.forEach(clearTimeout);
  }

  function incrementProgressFactory(total) {
    let processed = 0; return () => { processed++; if (progressBar) progressBar.style.width = `${Math.min(100, Math.round((processed / total) * 100))}%`; };
  }

  const preferNativeFileSystem = false;
  async function nativeSaveFile(blob, suggestedName, mime) {
    if (!preferNativeFileSystem || !('showSaveFilePicker' in window)) return 'unsupported';
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName,
        types: [{ description: 'File', accept: { [mime || blob.type || 'application/octet-stream']: ['.' + (suggestedName.split('.').pop() || 'bin')] } }]
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return 'saved';
    } catch (e) {
      if (e && e.name === 'AbortError') return 'cancelled';
      console.warn('nativeSaveFile failed, falling back to download.', e);
      return 'failed';
    }
  }

  async function nativeSaveMultiple(results) {
    if (!preferNativeFileSystem || !('showDirectoryPicker' in window)) return 'unsupported';
    try {
      const root = await window.showDirectoryPicker({ mode: 'readwrite' });
      for (const item of results) {
        const parts = item.zipPath.split('/').filter(Boolean);
        let dir = root;
        for (let i = 0; i < parts.length - 1; i++) {
          dir = await dir.getDirectoryHandle(parts[i], { create: true });
        }
        const filename = parts[parts.length - 1];
        const fileHandle = await dir.getFileHandle(filename, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(item.blob);
        await writable.close();
      }
      return 'saved';
    } catch (e) {
      if (e && e.name === 'AbortError') return 'cancelled';
      console.warn('nativeSaveMultiple failed, falling back to ZIP download.', e);
      return 'failed';
    }
  }

  async function convert() {
    if (!state.files.length || state.converting) return;
    const exportingPdf = state.outputFormat === 'pdf';
    const mergeAll = exportingPdf && state.pdfMode === 'merged';
    const outputConfig = config.outputs[state.outputFormat] || {};
    const fileExtension = (outputConfig.fileExtension || state.outputFormat || 'jpg').replace(/^\./, '');
    const preserveAlpha = Boolean(outputConfig.preserveAlpha);
    const targetFormatLabel = outputConfig.formatLabel || (state.outputFormat || 'tệp').toUpperCase();

    if (state.files.some(e => e.type === 'pdf') && !pdfjs) { updateStatus(statusText('missingPdfReader'), 'error'); return; }

    const jsPDFLib = exportingPdf ? (window.jspdf && window.jspdf.jsPDF) : null;
    if (exportingPdf && !jsPDFLib) { updateStatus(statusText('missingPdfGenerator'), 'error'); return; }
    if (typeof JSZip !== 'function' || typeof saveAs !== 'function') { updateStatus(statusText('missingZipLibrary'), 'error'); return; }

    state.converting = true; convertBtn.disabled = true;

    const preset = QUALITY_PRESETS[state.quality] || QUALITY_PRESETS.normal;
    const tone = preset.tone === 'warn' ? 'warn' : 'info';
    const scale = preset.dpi / 72; const jpegQuality = preset.jpegQuality;

    updateStatus(exportingPdf ? (mergeAll ? 'Merging everything into a single PDF.' : 'Exporting each item to a separate PDF.') : `Starting export to ${targetFormatLabel}.`, tone);

    if (progressWrap) { progressWrap.style.display = 'block'; if (progressBar) progressBar.style.width = '0%'; }
    const releaseTimers = createLongTaskTimers(state.quality, tone);
    let totalItems = state.files.reduce((sum, e) => sum + (e.type === 'pdf' ? Math.max(1, e.pages || 0) : 1), 0);
    if (!totalItems) totalItems = state.files.length || 1;
    const increment = incrementProgressFactory(totalItems);

    const archiveRootBase = sanitizeName(config.slug || 'ket-qua') || 'ket-qua';
    const archiveRoot = `${archiveRootBase}-${state.outputFormat || 'xuat'}`;
    const usedBaseNames = Object.create(null);
    const getUniqueBaseName = (base) => {
      const key = base || 'tep';
      const count = usedBaseNames[key] || 0;
      usedBaseNames[key] = count + 1;
      return count ? `${key}-${count + 1}` : key;
    };
    const resultFiles = [];
    const gatherResultFileNames = () => resultFiles
      .map((item) => (item.outputFilename || item.zipPath || '').split('/').pop() || '')
      .map((name) => name.trim().replace(/\s+/g, ' '))
      .filter(Boolean);
    const pushResult = (filename, blob) => {
      const safeName = (filename || '').replace(/[\\/]+/g, '-');
      const zipPath = `${archiveRoot}/${safeName}`;
      resultFiles.push({ zipPath, outputFilename: safeName, blob });
    };

    const appendCanvasToDoc = (doc, canvas) => {
      const orientation = canvas.width >= canvas.height ? 'l' : 'p';
      const format = [canvas.width || 1, canvas.height || 1];
      const dataUrl = canvas.toDataURL('image/jpeg', jpegQuality);
      if (!doc) doc = new jsPDFLib({orientation, unit: 'px', format}); else doc.addPage(format, orientation);
      doc.addImage(dataUrl, 'JPEG', 0, 0, canvas.width, canvas.height); return doc;
    };

    try {
      let mergedDoc = null;
      for (const entry of state.files) {
        updateStatus(`Processing "${entry.name}" to ${targetFormatLabel}…`, tone);
        const baseLabel = entry.name ? entry.name.replace(/\.[^.]+$/, '') : '';
        const folderBase = sanitizeName(baseLabel) || `tep-${entry.id}`;
        const entryBase = getUniqueBaseName(folderBase);

        if (entry.type === 'pdf') {
          const pdf = await loadPdf(entry);
          const pageCount = pdf.numPages || 1;
          for (let pageIndex = 1; pageIndex <= pageCount; pageIndex++) {
            const page = await pdf.getPage(pageIndex);
            const canvas = await renderPdfPageToCanvas(page, scale);
            if (exportingPdf && jsPDFLib) {
              if (mergeAll) {
                mergedDoc = appendCanvasToDoc(mergedDoc, canvas);
              } else {
                const singleDoc = appendCanvasToDoc(null, canvas);
                const pdfBlob = singleDoc.output('blob');
                const suffix = pageCount > 1 ? `-trang-${String(pageIndex).padStart(3, '0')}` : '';
                const pdfName = `${entryBase}${suffix}.pdf`;
                pushResult(pdfName, pdfBlob);
              }
            } else {
              const blob = await canvasToImageBlob(canvas, outputConfig, preset);
              const suffix = pageCount > 1 ? `-trang-${String(pageIndex).padStart(3, '0')}` : '';
              const outputName = `${entryBase}${suffix}.${fileExtension}`;
              pushResult(outputName, blob);
            }
            increment();
          }
        } else {
          const canvas = await rasterizeImageFile(entry.file, {preserveAlpha});
          if (exportingPdf && jsPDFLib) {
            if (mergeAll) {
              mergedDoc = appendCanvasToDoc(mergedDoc, canvas);
            } else {
              const singleDoc = appendCanvasToDoc(null, canvas);
              const pdfBlob = singleDoc.output('blob');
              pushResult(`${entryBase}.pdf`, pdfBlob);
            }
          } else {
            const blob = await canvasToImageBlob(canvas, outputConfig, preset);
            pushResult(`${entryBase}.${fileExtension}`, blob);
          }
          increment();
        }
      }

      if (mergeAll && exportingPdf && mergedDoc) {
        const mergedBlob = mergedDoc.output('blob');
        const mergedName = state.files.length === 1
          ? `${sanitizeName(state.files[0].name.replace(/\.[^.]+$/, ''))}.pdf`
          : `${config.slug || 'tong-hop'}-${state.files.length}-tep.pdf`;
        let saveOutcome = 'failed';
        try { saveOutcome = await nativeSaveFile(mergedBlob, mergedName, 'application/pdf'); }
        catch (err) { console.warn('nativeSaveFile failed for merged PDF.', err); }
        if (saveOutcome === 'cancelled') {
          updateStatus(statusText('saveCanceled'), 'info');
          return;
        }
        if (saveOutcome !== 'saved') saveAs(mergedBlob, mergedName);
        const mergedDetail = describeDownloadedTargets([mergedName]);
        const mergedMessage = mergedDetail ? `${mergedDetail} downloaded` : 'File downloaded';
        updateStatus(buildDownloadAnnouncement(mergedMessage, DOWNLOAD_HINT_BROWSER), 'success');
      } else {
        if (resultFiles.length === 1) {
          const item = resultFiles[0];
          let saveOutcome = 'failed';
          try { saveOutcome = await nativeSaveFile(item.blob, item.outputFilename, item.blob.type); }
          catch (err) { console.warn('nativeSaveFile failed for single export.', err); }
          if (saveOutcome === 'cancelled') {
          updateStatus(statusText('saveCanceled'), 'info');
            return;
          }
          if (saveOutcome !== 'saved') saveAs(item.blob, item.outputFilename);
          const singleDetail = describeDownloadedTargets(gatherResultFileNames());
          const singleMessage = singleDetail ? `${singleDetail} downloaded` : 'File downloaded';
          updateStatus(buildDownloadAnnouncement(singleMessage, DOWNLOAD_HINT_BROWSER), 'success');
        } else {
          let dirOutcome = 'unsupported';
          if ('showDirectoryPicker' in window) {
            try { dirOutcome = await nativeSaveMultiple(resultFiles); }
            catch (err) { console.warn('nativeSaveMultiple threw an error.', err); dirOutcome = 'failed'; }
          }
          if (dirOutcome === 'cancelled') {
          updateStatus(statusText('saveCanceled'), 'info');
            return;
          }
          if (dirOutcome === 'saved') {
            const savedDetail = describeDownloadedTargets(gatherResultFileNames());
            const savedMessage = savedDetail ? `${savedDetail} saved` : 'Files saved';
            updateStatus(buildDownloadAnnouncement(savedMessage, DOWNLOAD_HINT_FOLDER), 'success');
          } else {
            const zip = new JSZip();
            for (const item of resultFiles) {
              zip.file(item.zipPath, item.blob);
            }
            let zipNameBase;
            if (exportingPdf) {
              zipNameBase = mergeAll ? outputConfig.zipNameBaseMerged : outputConfig.zipNameBaseSeparate;
            } else { zipNameBase = outputConfig.zipNameBase; }
            if (!zipNameBase) zipNameBase = `${config.slug || 'ket-qua'}-${state.outputFormat || 'xuat'}`;
            const zipBlob = await zip.generateAsync({type: 'blob'});
            const zipFilename = `${zipNameBase}-${Date.now()}.zip`;
            saveAs(zipBlob, zipFilename);
            const zipDetail = `ZIP "${zipFilename}" downloaded`;
            updateStatus(buildDownloadAnnouncement(zipDetail, DOWNLOAD_HINT_BROWSER), 'success');
          }
        }
      }
    } catch (err) {
      console.error(err);
      updateStatus(statusText('conversionError'), 'error');
    } finally {
      state.converting = false;
      convertBtn.disabled = !state.files.length;
      if (progressWrap) progressWrap.style.display = 'none';
      if (progressBar) progressBar.style.width = '0%';
      try { releaseTimers?.(); } catch {}
    }
  }

  applyConversionIcons();
  if (singleOutput && formatOptions) { formatOptions.style.display = 'none'; formatOptions.setAttribute('aria-hidden', 'true'); }
  else if (formatOptions) { formatOptions.style.display = ''; formatOptions.removeAttribute?.('aria-hidden'); }
  setOutputFormat(state.outputFormat);
  renderGrid();
  attachEventListeners();
})();

