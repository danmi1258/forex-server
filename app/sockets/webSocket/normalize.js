const actionTypes = {
    POST: 'create',
    PUT: 'update',
    DELETE: 'delete'
}

export default function(req, data) {
    return {
        data: data,
        action: actionTypes[req.method],
        affectedFields: Object.keys(req.body),
        author: req.user ? req.user._id : null
    }
}
