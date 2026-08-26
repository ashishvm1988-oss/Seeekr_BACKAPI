const codes = {
    ER_NO_REFERENCED_ROW_2: 'User does not exist'
}

exports.genericErrorMessage = (error) => {
    return (
        codes[error.code] || error?.message
    )
}