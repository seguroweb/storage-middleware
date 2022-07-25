const multer = require('multer')
const axios = require('axios')
var FormData = require('form-data');

const Storage = multer.memoryStorage()

const upload = multer({ storage: Storage }).array('recfile')

// primer middleware -> cachea en memoria los archivos ingresados
const cacheFiles = (req, res, next) => {
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
    const { url, api_key_storage, field_name_form } = options;
    const { scope } = req.headers

    const field_name = field_name_form || 'recfile';

    // generar un form data 
    var form = new FormData();

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
                "Content-Type": "multipart/form-data; boundary=??????",
                "Accept": "*/*",
                "accept-encoding": "gzip, deflate, br",
                "api_key_storage": api_key_storage
            },
            method: 'post',
            url: url + '/' + scope,
            data: form
        })

        // setea el ojeto req
        req.filesUploaded = result.data;

        // avanza al controller
        next();
    } catch (error) {
        console.log(error.response)
        const { data } = error.response
        res.send({ msg: 'ErrorStorageMiddleware: error al subir los archivos', data })
    }
}

// fuciona los dos middlwares en uno

function StorageGYS(options) {
    this.union = (req, res, next) => {
        return cacheFiles(req, res, () => {
            uploadCache(req, res, () => {
                next()
            }, options)
        })
    }
    return this.union;
}





module.exports = StorageGYS;