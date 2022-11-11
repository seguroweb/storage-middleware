const axios = require('axios')
var FormData = require('form-data');

const preCacheFiles = (options) => {
    const multer = require('multer')
    const field_name = options.field_name_form || 'recfile'
    const Storage = multer.memoryStorage()

   return multer({ storage: Storage }).array( field_name )
}

// primer middleware -> cachea en memoria los archivos ingresados
const cacheFiles = (req, res, next, options) => {
    const upload = preCacheFiles(options)
    upload(req, res, next, function (e) {
        // si no se puede cachear los archivos enviar un error
        if (e) return res.send('error al guardar en cache los archivos');
        // pasa al siguiente middleware
        next()
    })
}

// enviar los archivos cacheados a la api
const uploadCache = async (req, res, next, options) => {
    // credenciales y opciones pasadas al constructor
    const { url, api_key_storage, project, scope } = options;
    const field_name = 'recfile';

    // generar un form data 
    var form = new FormData();

    if(req.files.length === 0 || !req.files){
        res.status(500).send('ErrorMiddleware: no se pueden leer los archivos')
    }

    // si son multiples archivos
    if (req.files) {
        for (const file of req.files) {
            // agrega los archivos al formulario
            form.append(field_name, file.buffer, file.originalname);
        }
    }

    try {

        //genera la peticion
        const result = await axios({
            headers: {
                "Content-Type": "multipart/form-data; boundary=----WebKitFormBoundarydMIgtiA2YeB1Z0kl",
                "Accept": "*/*",
                "accept-encoding": "gzip, deflate, br",
                "keystorage": api_key_storage,
                "scope": scope || 'public',
                "project": project || 'test'
            },
            method: 'post',
            url: url,
            data: form
        })

        // setea el ojeto req
        req.filesUploaded = result.data;

        // avanza al controller
        next();
    } catch (error) {
        console.log(error)
        res.send({ msg: 'ErrorStorageMiddleware: error al subir los archivos' })
    }
}

// fuciona los dos middlwares en uno

function StorageGYS(options) {
    this.union = (req, res, next) => {
        return cacheFiles(req, res, () => {
            uploadCache(req, res, () => {
                next()
            }, options)
        },options)
    }
    return this.union;
}





module.exports = StorageGYS;